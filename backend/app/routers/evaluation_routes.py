from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.dependencies import current_user
from app.services.evaluation_service import evaluate_answer

router = APIRouter(prefix="", tags=["evaluation"])


class EvalIn(BaseModel):
    questionId: str | None = None
    question_id: str | None = None
    studentAnswer: str | None = None
    student_answer: str | None = None
    selectedOption: str | None = None
    selected_option: str | None = None
    studentId: str | None = None
    telemetryData: dict = {}


def _evaluate_payload(data: EvalIn, user: dict):
    question_id = data.questionId or data.question_id
    if not question_id:
        raise HTTPException(status_code=400, detail="questionId is required")

    from app.services.question_service import get_question_raw
    raw = get_question_raw(question_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Question not found")

    is_mcq = (raw.get("question_type") or "descriptive").lower() == "mcq"
    answer = data.selectedOption or data.selected_option or data.studentAnswer or data.student_answer or ""

    if not str(answer).strip():
        max_marks = 1 if is_mcq else int(raw.get("marks") or 5)
        result = {
            "score": 0.0,
            "marksObtained": 0.0,
            "maxMarks": max_marks,
            "percentage": 0,
            "rubricScore": 0,
            "similarityScore": 0,
            "keywordScore": 0,
            "semanticScore": 0,
            "formulaScore": 0,
            "ruleScore": 0,
            "slmScore": 0,
            "selectedOption": "" if is_mcq else None,
            "correctOption": (raw.get("correct_option") or "").upper().strip() if is_mcq else None,
            "isCorrect": False,
            "feedback": "Not attempted.",
            "improvedAnswer": raw.get("explanation") or raw.get("model_answer") or "",
            "modelAnswer": raw.get("model_answer") or "",
            "explanation": raw.get("explanation") or "",
            "weakAreas": [raw.get("mapped_topic") or "This topic"],
        }
        from app.services.evaluation_service import save_result
        save_result(question_id, "", result, user.get("id"), selected_option="" if is_mcq else None)
        return result

    try:
        return evaluate_answer(question_id, answer, user.get("id"), data.telemetryData)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/student/answers/submit")
def submit_answer(data: EvalIn, user: dict = Depends(current_user)):
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return _evaluate_payload(data, user)


# Backward-compatible route used by old answer-evaluation page.
@router.post("/evaluate/answer")
def evaluate(data: EvalIn, user: dict = Depends(current_user)):
    return _evaluate_payload(data, user)
