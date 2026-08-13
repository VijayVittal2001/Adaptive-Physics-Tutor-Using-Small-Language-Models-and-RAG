from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.core.dependencies import admin_user, current_user
from app.services.question_service import create_question, delete_question, get_question_media, list_questions, save_question_media, update_question

router = APIRouter(prefix="", tags=["questions"])


class QuestionIn(BaseModel):
    chapter_id: str | None = None
    chapterId: str | None = None
    topic_id: str | None = None
    topicId: str | None = None
    subtopic_id: str | None = None
    subtopicId: str | None = None
    question_type: str | None = None
    questionType: str | None = None
    text: str | None = None
    question_text: str | None = None
    questionText: str | None = None
    marks: int = Field(default=2)
    difficulty: str | None = None
    bloom_level: str | None = None
    bloomLevel: str | None = None
    model_answer: str | None = None
    modelAnswer: str | None = None
    rubric: str | None = None
    rubric_text: str | None = None
    rubricText: str | None = None
    keywords: str | list[str] | None = None
    keywords_text: str | None = None
    keywordsText: str | None = None
    option_a: str | None = None
    optionA: str | None = None
    option_b: str | None = None
    optionB: str | None = None
    option_c: str | None = None
    optionC: str | None = None
    option_d: str | None = None
    optionD: str | None = None
    correct_option: str | None = None
    correctOption: str | None = None
    explanation: str | None = None


@router.post("/admin/questions")
def admin_create_question(data: QuestionIn, user: dict = Depends(admin_user)):
    try:
        return create_question(data.model_dump(exclude_none=True), user.get("id"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/admin/questions")
def admin_questions(
    chapter_id: str = Query("all"),
    topic_id: str = Query("all"),
    difficulty: str = Query("all"),
    bloom_level: str = Query("all"),
    marks: str = Query("all"),
    user: dict = Depends(admin_user),
):
    return list_questions(chapter_id, topic_id, difficulty, bloom_level, marks, include_answer=True)


@router.put("/admin/questions/{question_id}")
def admin_update_question(question_id: str, data: QuestionIn, user: dict = Depends(admin_user)):
    try:
        updated = update_question(question_id, data.model_dump(exclude_none=True), user.get("id"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated


@router.delete("/admin/questions/{question_id}")
def admin_delete_question(question_id: str, user: dict = Depends(admin_user)):
    if not delete_question(question_id):
        raise HTTPException(status_code=404, detail="Question not found")
    return {"ok": True, "deleted": question_id}


@router.post("/admin/questions/{question_id}/media")
async def admin_upload_question_media(
    question_id: str,
    image: UploadFile | None = File(None),
    solution_video: UploadFile | None = File(None),
    user: dict = Depends(admin_user),
):
    print("RECEIVED MEDIA UPLOAD:", "image=", image is not None, "video=", solution_video is not None)
    try:
        updated = await save_question_media(question_id, image, solution_video)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated


@router.get("/admin/questions/{question_id}/image")
def question_image(question_id: str):
    media = get_question_media(question_id, "image")
    if not media or not Path(media["path"]).exists():
        raise HTTPException(status_code=404, detail="Question image not found")
    return FileResponse(media["path"], media_type=media["mime"], filename=media["name"], content_disposition_type="inline")


@router.get("/admin/questions/{question_id}/solution-video")
def question_solution_video(question_id: str):
    media = get_question_media(question_id, "solution_video")
    if not media or not Path(media["path"]).exists():
        raise HTTPException(status_code=404, detail="Question solution video not found")
    return FileResponse(media["path"], media_type=media["mime"], filename=media["name"], content_disposition_type="inline")


@router.get("/questions")
def student_questions(
    chapter_id: str = Query("all"),
    topic_id: str = Query("all"),
    difficulty: str = Query("all"),
    bloom_level: str = Query("all"),
    marks: str = Query("all"),
    user: dict = Depends(current_user),
):
    include_answer = user.get("role") == "admin"
    student_id = user.get("id") if user.get("role") == "student" else None
    return list_questions(chapter_id, topic_id, difficulty, bloom_level, marks, include_answer=include_answer, student_id=student_id)


# Backward-compatible endpoints used by old frontend screens.
@router.get("/questions/list")
def questions(
    chapterId: str = "all",
    chapter_id: str = "all",
    topicId: str = "all",
    topic_id: str = "all",
    difficulty: str = "all",
    bloomLevel: str = "all",
    bloom_level: str = "all",
    marks: str = "all",
    user: dict = Depends(current_user),
):
    include_answer = user.get("role") == "admin"
    student_id = user.get("id") if user.get("role") == "student" else None
    return list_questions(
        chapter_id if chapter_id != "all" else chapterId,
        topic_id if topic_id != "all" else topicId,
        difficulty,
        bloom_level if bloom_level != "all" else bloomLevel,
        marks,
        include_answer=include_answer,
        student_id=student_id,
    )


@router.post("/test/generate")
def generate_test(settings: dict, user: dict = Depends(current_user)):
    include_answer = user.get("role") == "admin"
    student_id = user.get("id") if user.get("role") == "student" else None
    return list_questions(
        settings.get("chapter_id") or settings.get("chapterId", "all"),
        settings.get("topic_id") or settings.get("topicId", "all"),
        settings.get("difficulty", "all"),
        settings.get("bloom_level") or settings.get("bloomLevel", "all"),
        str(settings.get("marks", "all")),
        include_answer=include_answer,
        student_id=student_id,
    )
