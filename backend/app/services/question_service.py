import json
import re
import shutil
from pathlib import Path
from sqlite3 import Connection
from typing import Any

from app.database.db import get_conn, new_id, now_iso
from app.core.config import settings
from app.services.rag_service import ask_rag
from app.utils.text_utils import keywords as make_keywords, slugify


VALID_BLOOM = {"Remembering", "Understanding", "Application"}
VALID_MARKS = {1, 2, 3, 5, 10}
VALID_OPTIONS = {"A", "B", "C", "D"}


def _json_loads(value: str | None, fallback: Any) -> Any:
    try:
        return json.loads(value or "")
    except Exception:
        return fallback


def classify_bloom(text: str) -> str:
    t = text.lower()
    if any(w in t for w in ["calculate", "solve", "find", "determine", "numerical", "value", "apply"]):
        return "Application"
    if any(w in t for w in ["explain", "why", "how", "describe", "derive", "differentiate", "compare", "justify"]):
        return "Understanding"
    return "Remembering"


def infer_marks(text: str) -> int:
    t = text.lower()
    patterns = [r"\((\d{1,2})\s*m(?:arks?)?\)", r"\[(\d{1,2})\]", r"(\d{1,2})\s*marks?", r"(\d{1,2})\s*m\b"]
    for p in patterns:
        m = re.search(p, t)
        if m:
            n = int(m.group(1))
            if n in [1, 2, 3, 4, 5, 10]:
                return 5 if n == 4 else n
    if any(w in t for w in ["derive", "long answer", "explain in detail", "with diagram"]):
        return 5
    if len(text) > 180:
        return 5
    if len(text) > 80:
        return 2
    return 1


def infer_difficulty(text: str, marks: int, bloom: str) -> str:
    if marks >= 5 or bloom == "Application":
        return "Hard" if marks >= 5 and bloom == "Application" else "Medium"
    if marks >= 2 or bloom == "Understanding":
        return "Medium"
    return "Easy"


def _map_question_to_topic(text: str) -> tuple[str, str, str]:
    rag = ask_rag(text, top_k=1)
    chunks = rag.get("retrievedChunks") or []
    if chunks:
        ch = chunks[0].get("chapter") or "Mapped Physics"
        top = chunks[0].get("topic") or rag.get("topic") or "Mapped Topic"
        return slugify(ch, "ch"), slugify(ch + " " + top, "top"), top
    return "unmapped", "unmapped-topic", "Unmapped Topic"


def split_questions(text: str) -> list[str]:
    original = text
    text = re.sub(r"\r", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    parts = re.split(r"(?:\n|^|\s)(?:Q\.?\s*)?\d{1,3}\s*[\).]\s+", text)
    questions = []
    for p in parts:
        p = re.sub(r"\s+", " ", p).strip()
        if len(p) >= 18 and any(w in p.lower() for w in ["what", "why", "how", "state", "explain", "derive", "calculate", "define", "write", "show", "find", "draw", "distinguish"]):
            p = re.split(r"\bAnswer\b|\bSolution\b", p, flags=re.I)[0].strip()
            questions.append(p[:900])
    if not questions:
        for line in original.splitlines():
            line = re.sub(r"\s+", " ", line).strip()
            if len(line) > 25 and line.endswith("?"):
                questions.append(line[:900])
    seen, out = set(), []
    for q in questions:
        key = q.lower()[:160]
        if key not in seen:
            out.append(q)
            seen.add(key)
    return out[:120]


def extract_questions_from_upload(conn: Connection, paper_id: str, full_text: str) -> int:
    qs = split_questions(full_text)
    count = 0
    for qtext in qs:
        marks = infer_marks(qtext)
        bloom = classify_bloom(qtext)
        difficulty = infer_difficulty(qtext, marks, bloom)
        chapter_id, topic_id, topic = _map_question_to_topic(qtext)
        answer = ask_rag(qtext, top_k=3).get("answer", "")
        rubric = {"keywords": make_keywords(qtext + " " + answer, 10), "formulas": [], "source": "extracted_from_question_paper"}
        conn.execute(
            """
            INSERT INTO questions(id,paper_id,topic_id,chapter_id,text,marks,difficulty,bloom_level,mapped_topic,model_answer,rubric_json,question_type,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (new_id("q"), paper_id, topic_id, chapter_id, qtext, marks, difficulty, bloom, topic, answer, json.dumps(rubric), "descriptive", now_iso()),
        )
        count += 1
    return count


def _topic_title(conn: Connection, topic_id: str | None) -> str:
    if not topic_id:
        return "Unmapped Topic"
    row = conn.execute("SELECT topic FROM rag_chunks WHERE topic_id=? AND topic IS NOT NULL LIMIT 1", (topic_id,)).fetchone()
    return row["topic"] if row and row["topic"] else topic_id


def _chapter_title(conn: Connection, chapter_id: str | None) -> str:
    if not chapter_id:
        return "Unmapped Chapter"
    row = conn.execute("SELECT chapter FROM rag_chunks WHERE chapter_id=? AND chapter IS NOT NULL LIMIT 1", (chapter_id,)).fetchone()
    return row["chapter"] if row and row["chapter"] else chapter_id


def _normalize_payload(data: dict, user_id: str | None = None, existing: dict | None = None) -> dict:
    existing = existing or {}
    question_type = (data.get("question_type") or data.get("questionType") or existing.get("question_type") or "descriptive").lower()
    if question_type not in {"mcq", "descriptive"}:
        raise ValueError("question_type must be mcq or descriptive")

    marks = int(data.get("marks") or existing.get("marks") or (1 if question_type == "mcq" else 2))
    if question_type == "mcq":
        marks = 1
    if marks not in {1, 2, 3, 5, 10}:
        raise ValueError("marks must be 1, 2, 3, 5 or 10")

    bloom = data.get("bloom_level") or data.get("bloomLevel") or existing.get("bloom_level") or "Remembering"
    bloom_map = {"remembering": "Remembering", "understanding": "Understanding", "application": "Application"}
    bloom = bloom_map.get(str(bloom).strip().lower(), str(bloom).strip())
    if bloom not in VALID_BLOOM:
        raise ValueError("Bloom level must be Remembering, Understanding or Application")

    text = (data.get("text") or data.get("question_text") or data.get("questionText") or existing.get("text") or "").strip()
    if len(text) < 3:
        raise ValueError("Question text is required")

    chapter_id = data.get("chapter_id") or data.get("chapterId") or existing.get("chapter_id") or "unmapped"
    topic_id = data.get("topic_id") or data.get("topicId") or existing.get("topic_id") or "unmapped-topic"
    subtopic_id = data.get("subtopic_id") or data.get("subtopicId") or existing.get("subtopic_id")
    difficulty = data.get("difficulty") or existing.get("difficulty") or infer_difficulty(text, marks, bloom)
    model_answer = data.get("model_answer") or data.get("modelAnswer") or existing.get("model_answer") or ""
    explanation = data.get("explanation") or existing.get("explanation") or ""
    correct_option = (data.get("correct_option") or data.get("correctOption") or existing.get("correct_option") or "").upper().strip()

    option_a = data.get("option_a") or data.get("optionA") or existing.get("option_a") or ""
    option_b = data.get("option_b") or data.get("optionB") or existing.get("option_b") or ""
    option_c = data.get("option_c") or data.get("optionC") or existing.get("option_c") or ""
    option_d = data.get("option_d") or data.get("optionD") or existing.get("option_d") or ""

    rubric_text = data.get("rubric") or data.get("rubric_text") or data.get("rubricText") or existing.get("rubric_text") or ""
    keywords_text = data.get("keywords") or data.get("keywords_text") or data.get("keywordsText") or existing.get("keywords_text") or ""
    if isinstance(keywords_text, list):
        keywords_list = [str(x).strip() for x in keywords_text if str(x).strip()]
        keywords_text = ", ".join(keywords_list)
    else:
        keywords_list = [x.strip() for x in re.split(r"[,\n;]+", str(keywords_text)) if x.strip()]

    rubric_json = data.get("rubric_json") or data.get("rubricJson") or existing.get("rubric_json")
    if isinstance(rubric_json, str):
        rubric_obj = _json_loads(rubric_json, {})
    elif isinstance(rubric_json, dict):
        rubric_obj = rubric_json
    else:
        rubric_obj = _json_loads(existing.get("rubric_json"), {})
    rubric_obj = {**rubric_obj, "rubric": rubric_text, "keywords": keywords_list}

    if question_type == "mcq":
        missing = [name for name, value in [("Option A", option_a), ("Option B", option_b), ("Option C", option_c), ("Option D", option_d)] if not str(value).strip()]
        if missing:
            raise ValueError("MCQ requires all four options")
        if correct_option not in VALID_OPTIONS:
            raise ValueError("MCQ requires correct option A, B, C or D")
        if not model_answer:
            model_answer = {"A": option_a, "B": option_b, "C": option_c, "D": option_d}.get(correct_option, "")
    else:
        if not model_answer.strip():
            raise ValueError("Model answer is required for descriptive evaluation")

    return {
        "chapter_id": chapter_id,
        "topic_id": topic_id,
        "subtopic_id": subtopic_id,
        "text": text,
        "marks": marks,
        "difficulty": difficulty,
        "bloom_level": bloom,
        "mapped_topic": data.get("mapped_topic") or data.get("mappedTopic") or existing.get("mapped_topic") or topic_id,
        "model_answer": model_answer,
        "rubric_json": json.dumps(rubric_obj),
        "rubric_text": rubric_text,
        "keywords_text": keywords_text,
        "question_type": question_type,
        "option_a": option_a,
        "option_b": option_b,
        "option_c": option_c,
        "option_d": option_d,
        "correct_option": correct_option,
        "explanation": explanation,
        "created_by": user_id or existing.get("created_by"),
    }


def _api_question(r: dict, include_answer: bool = False) -> dict:
    rubric = _json_loads(r.get("rubric_json"), {})
    qtype = (r.get("question_type") or ("mcq" if r.get("correct_option") else "descriptive")).lower()
    data = {
        "id": r["id"],
        "topicId": r.get("topic_id") or "unmapped-topic",
        "chapterId": r.get("chapter_id") or "unmapped",
        "subtopicId": r.get("subtopic_id"),
        "text": r["text"],
        "questionText": r["text"],
        "questionType": qtype,
        "marks": r["marks"],
        "difficulty": r.get("difficulty") or "Easy",
        "bloomLevel": r.get("bloom_level") or "Remembering",
        "mappedTopic": r.get("mapped_topic") or r.get("topic_id") or "Mapped Physics Topic",
        "options": [],
        "alreadyAnswered": bool(r.get("already_answered", 0)),
        "lastResult": _json_loads(r.get("last_result_json"), None) if r.get("last_result_json") else None,
        "createdAt": r.get("created_at"),
        "imageUrl": f"/api/admin/questions/{r['id']}/image" if r.get("image_path") else None,
        "imageOriginalName": r.get("image_original_name"),
        "solutionVideoUrl": f"/api/admin/questions/{r['id']}/solution-video" if r.get("solution_video_path") else None,
        "solutionVideoOriginalName": r.get("solution_video_original_name"),
    }
    if qtype == "mcq":
        data["options"] = [
            {"key": "A", "text": r.get("option_a") or ""},
            {"key": "B", "text": r.get("option_b") or ""},
            {"key": "C", "text": r.get("option_c") or ""},
            {"key": "D", "text": r.get("option_d") or ""},
        ]
    if include_answer:
        data.update({
            "modelAnswer": r.get("model_answer") or "",
            "rubric": rubric,
            "rubricText": r.get("rubric_text") or rubric.get("rubric") or "",
            "keywords": r.get("keywords_text") or ", ".join(rubric.get("keywords") or []),
            "correctOption": r.get("correct_option") or "",
            "explanation": r.get("explanation") or "",
        })
    return data


def create_question(data: dict, user_id: str | None = None) -> dict:
    payload = _normalize_payload(data, user_id=user_id)
    qid = new_id("q")
    with get_conn() as conn:
        topic_title = _topic_title(conn, payload["topic_id"])
        payload["mapped_topic"] = data.get("mappedTopic") or data.get("mapped_topic") or topic_title
        conn.execute(
            """
            INSERT INTO questions(
                id, paper_id, topic_id, chapter_id, subtopic_id, text, marks, difficulty, bloom_level,
                mapped_topic, model_answer, rubric_json, question_type, option_a, option_b, option_c,
                option_d, correct_option, explanation, rubric_text, keywords_text, created_by, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                qid, None, payload["topic_id"], payload["chapter_id"], payload["subtopic_id"], payload["text"],
                payload["marks"], payload["difficulty"], payload["bloom_level"], payload["mapped_topic"],
                payload["model_answer"], payload["rubric_json"], payload["question_type"], payload["option_a"],
                payload["option_b"], payload["option_c"], payload["option_d"], payload["correct_option"],
                payload["explanation"], payload["rubric_text"], payload["keywords_text"], payload["created_by"], now_iso(),
            ),
        )
        row = conn.execute("SELECT * FROM questions WHERE id=?", (qid,)).fetchone()
    # Keep the RAG vector store synchronized with manually uploaded Q&A.
    try:
        from app.services.vector_service import rebuild_index
        rebuild_index()
    except Exception:
        pass
    return _api_question(dict(row), include_answer=True)


def update_question(question_id: str, data: dict, user_id: str | None = None) -> dict | None:
    with get_conn() as conn:
        old = conn.execute("SELECT * FROM questions WHERE id=?", (question_id,)).fetchone()
        if not old:
            return None
        payload = _normalize_payload(data, user_id=user_id, existing=dict(old))
        topic_title = _topic_title(conn, payload["topic_id"])
        payload["mapped_topic"] = data.get("mappedTopic") or data.get("mapped_topic") or topic_title
        conn.execute(
            """
            UPDATE questions SET
                topic_id=?, chapter_id=?, subtopic_id=?, text=?, marks=?, difficulty=?, bloom_level=?,
                mapped_topic=?, model_answer=?, rubric_json=?, question_type=?, option_a=?, option_b=?,
                option_c=?, option_d=?, correct_option=?, explanation=?, rubric_text=?, keywords_text=?
            WHERE id=?
            """,
            (
                payload["topic_id"], payload["chapter_id"], payload["subtopic_id"], payload["text"], payload["marks"],
                payload["difficulty"], payload["bloom_level"], payload["mapped_topic"], payload["model_answer"],
                payload["rubric_json"], payload["question_type"], payload["option_a"], payload["option_b"],
                payload["option_c"], payload["option_d"], payload["correct_option"], payload["explanation"],
                payload["rubric_text"], payload["keywords_text"], question_id,
            ),
        )
        row = conn.execute("SELECT * FROM questions WHERE id=?", (question_id,)).fetchone()
    try:
        from app.services.vector_service import rebuild_index
        rebuild_index()
    except Exception:
        pass
    return _api_question(dict(row), include_answer=True)


def delete_question(question_id: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM questions WHERE id=?", (question_id,))
        deleted = cur.rowcount > 0
    if deleted:
        try:
            from app.services.vector_service import rebuild_index
            rebuild_index()
        except Exception:
            pass
    return deleted



def _safe_filename(name: str | None, fallback: str) -> str:
    raw = Path(name or fallback).name
    raw = re.sub(r"[^A-Za-z0-9._-]+", "_", raw).strip("._")
    return raw or fallback


async def save_question_media(question_id: str, image_file=None, solution_video_file=None) -> dict | None:
    """Attach optional diagram/photo and optional solution video to a question."""
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM questions WHERE id=?", (question_id,)).fetchone()
        if not row:
            return None
        updates, params = [], []
        if image_file is not None:
            mime = image_file.content_type or ""
            if not mime.startswith("image/"):
                raise ValueError("Question photo must be an image file")
            folder = settings.question_media_dir / "images"
            folder.mkdir(parents=True, exist_ok=True)
            ext = Path(image_file.filename or "image.png").suffix or ".png"
            dest = folder / f"{question_id}{ext}"
            with dest.open("wb") as out:
                shutil.copyfileobj(image_file.file, out)
            updates += ["image_path=?", "image_original_name=?", "image_mime_type=?"]
            params += [str(dest), _safe_filename(image_file.filename, dest.name), mime]
        if solution_video_file is not None:
            mime = solution_video_file.content_type or ""
            if not (mime.startswith("video/") or mime in {"application/octet-stream"}):
                raise ValueError("Solution video must be a video file")
            folder = settings.question_media_dir / "solution_videos"
            folder.mkdir(parents=True, exist_ok=True)
            ext = Path(solution_video_file.filename or "solution.mp4").suffix or ".mp4"
            dest = folder / f"{question_id}{ext}"
            with dest.open("wb") as out:
                shutil.copyfileobj(solution_video_file.file, out)
            updates += ["solution_video_path=?", "solution_video_original_name=?", "solution_video_mime_type=?"]
            params += [str(dest), _safe_filename(solution_video_file.filename, dest.name), mime or "video/mp4"]
        if updates:
            params.append(question_id)
            conn.execute(f"UPDATE questions SET {', '.join(updates)} WHERE id=?", params)
        updated = conn.execute("SELECT * FROM questions WHERE id=?", (question_id,)).fetchone()
    return _api_question(dict(updated), include_answer=True)


def get_question_media(question_id: str, kind: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM questions WHERE id=?", (question_id,)).fetchone()
    if not row:
        return None
    q = dict(row)
    if kind == "image":
        path = q.get("image_path")
        if not path:
            return None
        return {"path": path, "mime": q.get("image_mime_type") or "image/png", "name": q.get("image_original_name") or Path(path).name}
    if kind == "solution_video":
        path = q.get("solution_video_path")
        if not path:
            return None
        return {"path": path, "mime": q.get("solution_video_mime_type") or "video/mp4", "name": q.get("solution_video_original_name") or Path(path).name}
    return None


def list_questions(
    chapter_id: str = "all",
    topic_id: str = "all",
    difficulty: str = "all",
    bloom_level: str = "all",
    marks: str = "all",
    include_answer: bool = False,
    student_id: str | None = None,
) -> list[dict]:
    params: list[Any] = []
    if student_id:
        sql = """
        SELECT q.*, er.result_json AS last_result_json,
               CASE WHEN er.id IS NULL THEN 0 ELSE 1 END AS already_answered
        FROM questions q
        LEFT JOIN (
            SELECT e1.* FROM evaluation_results e1
            JOIN (SELECT question_id, MAX(created_at) AS latest FROM evaluation_results WHERE student_id=? GROUP BY question_id) e2
            ON e1.question_id=e2.question_id AND e1.created_at=e2.latest
            WHERE e1.student_id=?
        ) er ON er.question_id=q.id
        WHERE 1=1
        """
        params.extend([student_id, student_id])
    else:
        sql = "SELECT q.* FROM questions q WHERE 1=1"
    if chapter_id and chapter_id != "all":
        sql += " AND q.chapter_id=?"; params.append(chapter_id)
    if topic_id and topic_id != "all":
        sql += " AND q.topic_id=?"; params.append(topic_id)
    if difficulty and difficulty != "all":
        sql += " AND lower(q.difficulty)=?"; params.append(str(difficulty).lower())
    if bloom_level and bloom_level != "all":
        sql += " AND lower(q.bloom_level)=?"; params.append(str(bloom_level).lower())
    if marks and marks != "all":
        sql += " AND q.marks=?"; params.append(int(marks))
    sql += " ORDER BY q.marks ASC, q.created_at DESC LIMIT 300"
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [_api_question(dict(r), include_answer=include_answer) for r in rows]


def get_question(question_id: str, include_answer: bool = True) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM questions WHERE id=?", (question_id,)).fetchone()
    return _api_question(dict(row), include_answer=include_answer) if row else None


def get_question_raw(question_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM questions WHERE id=?", (question_id,)).fetchone()
    return dict(row) if row else None


def question_counts_by_topic() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT q.topic_id, q.chapter_id, COUNT(*) total,
                   SUM(CASE WHEN q.marks=1 THEN 1 ELSE 0 END) one_mark,
                   SUM(CASE WHEN q.marks=2 THEN 1 ELSE 0 END) two_mark,
                   SUM(CASE WHEN q.marks=3 THEN 1 ELSE 0 END) three_mark,
                   SUM(CASE WHEN q.marks=5 THEN 1 ELSE 0 END) five_mark
            FROM questions q GROUP BY q.topic_id, q.chapter_id ORDER BY total DESC
            """
        ).fetchall()
    return [dict(r) for r in rows]
