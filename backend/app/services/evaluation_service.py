import json
import re
import math
from typing import Any

from app.database.db import get_conn, new_id, now_iso
from app.services.question_service import get_question, get_question_raw
from app.services.rag_service import ask_rag
from app.services.slm_service import ask_ollama
from app.services.vector_service import _ollama_embedding
from app.utils.text_utils import overlap_score

def cosine_similarity(v1: list[float] | None, v2: list[float] | None) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def _json_loads(value: str | None, fallback: Any) -> Any:
    try:
        return json.loads(value or "")
    except Exception:
        return fallback


def _formula_score(answer: str, formulas: list[str]) -> tuple[int, list[str]]:
    if not formulas:
        return 100, []
    cleaned = answer.lower().replace(" ", "")
    matched = []
    for f in formulas:
        f_clean = str(f).lower().replace(" ", "").replace("*", "")
        if f_clean and f_clean[:6] in cleaned:
            matched.append(f)
    return round(len(matched) / len(formulas) * 100), matched


def _keywords_from_raw(raw: dict) -> list[str]:
    rubric = _json_loads(raw.get("rubric_json"), {})
    kws = rubric.get("keywords") or []
    if raw.get("keywords_text"):
        kws.extend([x.strip() for x in re.split(r"[,\n;]+", raw["keywords_text"]) if x.strip()])
    # preserve order but remove duplicates
    out, seen = [], set()
    for kw in kws:
        key = str(kw).lower()
        if key not in seen:
            out.append(str(kw)); seen.add(key)
    return out


def evaluate_mcq(question_id: str, selected_option: str, student_id: str | None = None) -> dict:
    raw = get_question_raw(question_id)
    if not raw:
        raise ValueError("Question not found")
    correct = (raw.get("correct_option") or "").upper().strip()
    selected = (selected_option or "").upper().strip()
    if selected not in {"A", "B", "C", "D"}:
        raise ValueError("Select option A, B, C or D")
    is_correct = selected == correct
    result = {
        "score": 1 if is_correct else 0,
        "marksObtained": 1 if is_correct else 0,
        "maxMarks": 1,
        "percentage": 100 if is_correct else 0,
        "rubricScore": 100 if is_correct else 0,
        "similarityScore": 100 if is_correct else 0,
        "keywordScore": 100 if is_correct else 0,
        "semanticScore": 100 if is_correct else 0,
        "formulaScore": 100,
        "ruleScore": 100 if is_correct else 0,
        "slmScore": 100 if is_correct else 0,
        "selectedOption": selected,
        "correctOption": correct,
        "isCorrect": is_correct,
        "feedback": "Correct answer." if is_correct else "Incorrect. Revise this concept and try similar MCQs again.",
        "improvedAnswer": raw.get("explanation") or raw.get("model_answer") or "Review the correct option after submission.",
        "modelAnswer": raw.get("model_answer") or "",
        "explanation": raw.get("explanation") or "",
        "weakAreas": [] if is_correct else [raw.get("mapped_topic") or "This topic"],
    }
    save_result(question_id, selected, result, student_id, selected_option=selected)
    return result


def evaluate_answer(question_id: str, student_answer: str, student_id: str | None = None, telemetry: dict | None = None) -> dict:
    telemetry = telemetry or {}
    raw = get_question_raw(question_id)
    if raw and (raw.get("question_type") or "descriptive").lower() == "mcq":
        return evaluate_mcq(question_id, student_answer, student_id)

    q = get_question(question_id, include_answer=True)
    if not q:
        q = {
            "id": question_id,
            "text": "General Physics answer",
            "marks": 5,
            "mappedTopic": "Physics Topic",
            "modelAnswer": ask_rag(student_answer).get("answer", ""),
            "rubric": {"keywords": []},
        }
        raw = {}
    raw = raw or {}
    model_answer = q.get("modelAnswer") or ask_rag(q["text"]).get("answer", "")
    rubric = q.get("rubric") or _json_loads(raw.get("rubric_json"), {}) or {}
    keywords = _keywords_from_raw(raw) or rubric.get("keywords") or []
    formulas = rubric.get("formulas") or []
    ans_lower = student_answer.lower()

    keywords_matched = [kw for kw in keywords if str(kw).lower() in ans_lower]
    if keywords:
        keyword_score = round(len(keywords_matched) / len(keywords) * 100)
    else:
        keyword_score = round(min(100, overlap_score(student_answer, model_answer) * 140))

    semantic_score = round(min(100, max(0, overlap_score(student_answer, model_answer + " " + q["text"]) * 115)))
    formula_score, formulas_matched = _formula_score(student_answer, formulas)
    
    # Calculate vector semantic similarity
    emb_student = _ollama_embedding(student_answer)
    emb_model = _ollama_embedding(model_answer)
    vector_sim = cosine_similarity(emb_student, emb_model) if emb_student and emb_model else 0.0
    vector_score = round(max(0, vector_sim) * 100)

    # Rubric score rewards keyword, concept overlap and length sufficiency for board answers.
    expected_words = 18 if int(q.get("marks") or 5) <= 2 else 45 if int(q.get("marks") or 5) <= 3 else 80
    answer_words = len(re.findall(r"[A-Za-z0-9]+", student_answer))
    length_score = min(100, round(answer_words / max(1, expected_words) * 100))
    rubric_score = round(0.45 * keyword_score + 0.40 * semantic_score + 0.15 * length_score)

    rule_score = 100
    numerical = rubric.get("numericalCheck") if isinstance(rubric, dict) else None
    if numerical:
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", student_answer)]
        expected = float(numerical.get("expectedValue", 0))
        tol = float(numerical.get("tolerance", 0.05))
        rule_score = 100 if any(abs(n - expected) <= tol for n in nums) else 20

    slm_score = round((semantic_score + keyword_score + rubric_score + vector_score) / 4)
    slm_comment = ask_ollama(
        f"Question: {q['text']}\nModel answer: {model_answer}\nRubric: {rubric.get('rubric') or raw.get('rubric_text') or ''}\nStudent answer: {student_answer}\nGive 3 short lines of exam feedback and one improved answer tip.",
        max_tokens=512,
    )
    weighted = 0.20 * vector_score + 0.20 * semantic_score + 0.20 * keyword_score + 0.15 * rubric_score + 0.15 * rule_score + 0.10 * slm_score
    max_marks = int(q.get("marks") or 5)
    score = round((weighted / 100) * max_marks, 1)

    weak_areas = []
    if keyword_score < 70:
        weak_areas.append(f"Missing key terms for {q.get('mappedTopic', 'this topic')}")
    if semantic_score < 60 and vector_score < 60:
        weak_areas.append("Concept explanation is too short or not aligned with model answer")
    if length_score < 45:
        weak_areas.append("Answer length is too short for the given marks")
    if not weak_areas:
        weak_areas.append("Minor improvement: add one exact exam keyword or diagram point")

    feedback = slm_comment or (
        "Excellent answer. It covers the key concept and expected terms." if weighted >= 80 else
        "Good attempt. Add exact keywords, clear sequence, and one example/formula to improve marks." if weighted >= 50 else
        "Revise the concept again. Your answer misses important points from the expected answer."
    )
    improved = ask_ollama(
        f"Rewrite this as a concise {max_marks}-mark Class 12 Physics answer. Question: {q['text']} Model answer: {model_answer}",
        max_tokens=512,
    ) or model_answer

    result = {
        "score": score,
        "marksObtained": score,
        "maxMarks": max_marks,
        "percentage": round(weighted),
        "rubricScore": rubric_score,
        "similarityScore": semantic_score,
        "keywordScore": keyword_score,
        "semanticScore": vector_score,
        "formulaScore": formula_score,
        "ruleScore": rule_score,
        "slmScore": slm_score,
        "feedback": feedback,
        "improvedAnswer": improved,
        "modelAnswer": model_answer,
        "keywordsMatched": keywords_matched,
        "formulasMatched": formulas_matched,
        "weakAreas": weak_areas,
        "cheatingWarning": "Paste events captured during exam mode." if telemetry.get("pasteAttempts", 0) else None,
        "typingAnomalyDetected": bool(telemetry.get("keyHesitations", 0) > 15 or telemetry.get("pasteAttempts", 0)),
        "recommendedVideo": {"id": "topic-video", "title": f"Revise {q.get('mappedTopic', 'Physics Topic')}", "duration": "Topic video"},
    }
    save_result(question_id, student_answer, result, student_id)
    return result


def save_result(question_id: str, student_answer: str, result: dict, student_id: str | None = None, selected_option: str | None = None) -> None:
    created_at = now_iso()
    with get_conn() as conn:
        answer_id = new_id("ans")
        conn.execute(
            "INSERT INTO student_answers(id,student_id,question_id,selected_option,answer_text,created_at) VALUES(?,?,?,?,?,?)",
            (answer_id, student_id, question_id, selected_option, student_answer, created_at),
        )
        conn.execute(
            "INSERT INTO evaluation_results(id,student_id,question_id,student_answer,result_json,created_at) VALUES(?,?,?,?,?,?)",
            (new_id("eval"), student_id, question_id, student_answer, json.dumps(result), created_at),
        )
