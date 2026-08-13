from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel

from app.core.dependencies import admin_user, current_user
from app.services.video_service import (
    delete_video,
    generate_video,
    get_script,
    get_video_file,
    list_videos,
    save_topic_video,
    save_youtube_video,
)

router = APIRouter(prefix="", tags=["video"])


class VideoIn(BaseModel):
    chapter_id: str | None = None
    chapterId: str | None = None
    topic_id: str | None = None
    topicId: str | None = None
    title: str | None = None
    description: str | None = None
    video_type: str | None = None
    videoType: str | None = None
    youtube_url: str | None = None
    youtubeUrl: str | None = None


def _topic(data: VideoIn) -> str:
    return data.topic_id or data.topicId or ""


def _chapter(data: VideoIn) -> str | None:
    return data.chapter_id or data.chapterId


@router.get("/admin/videos")
def admin_videos(chapter_id: str | None = None, topic_id: str | None = None, user: dict = Depends(admin_user)):
    return list_videos(topic_id=topic_id, chapter_id=chapter_id)


@router.post("/admin/videos")
def admin_add_youtube_video(data: VideoIn, user: dict = Depends(admin_user)):
    try:
        if (data.video_type or data.videoType or "youtube").lower() != "youtube":
            raise ValueError("Use /admin/videos/upload for file uploads")
        return save_youtube_video(_topic(data), data.title or "Topic video", data.youtube_url or data.youtubeUrl or "", _chapter(data), data.description)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/admin/videos/upload")
async def admin_upload_video(
    file: UploadFile = File(...),
    topic_id: str = Form(...),
    chapter_id: str | None = Form(None),
    title: str | None = Form(None),
    description: str | None = Form(None),
    user: dict = Depends(admin_user),
):
    try:
        return await save_topic_video(file, topic_id, title, chapter_id, description)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/admin/videos/{video_id}")
def admin_delete_video(video_id: str, user: dict = Depends(admin_user)):
    if not delete_video(video_id):
        raise HTTPException(status_code=404, detail="Video not found")
    return {"ok": True, "deleted": video_id}


@router.get("/videos")
def student_videos(chapter_id: str | None = None, topic_id: str | None = None, user: dict = Depends(current_user)):
    return list_videos(topic_id=topic_id, chapter_id=chapter_id)


# Backward-compatible old routes.
legacy_router = APIRouter(prefix="/video", tags=["video"])


@legacy_router.get("/list")
def videos(topicId: str | None = None, topic_id: str | None = None, user: dict = Depends(current_user)):
    return list_videos(topic_id or topicId)


@legacy_router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    topic_id: str = Form(...),
    title: str | None = Form(None),
    user: dict = Depends(admin_user),
):
    try:
        return await save_topic_video(file, topic_id, title)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@legacy_router.post("/youtube")
def youtube_video(data: VideoIn, user: dict = Depends(admin_user)):
    try:
        return save_youtube_video(_topic(data), data.title or "Topic video", data.youtube_url or data.youtubeUrl or "", _chapter(data), data.description)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@legacy_router.post("/generate-topic-video")
def gen(data: VideoIn, user: dict = Depends(admin_user)):
    return generate_video(data.topicId or data.topic_id or "top-101", data.title)


@legacy_router.get("/{video_id}/stream")
def stream(video_id: str):
    video = get_video_file(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Uploaded video not found")
    path = Path(video["file_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video file missing on disk")
    return FileResponse(
        str(path),
        media_type=video.get("mime_type") or "video/mp4",
        filename=video.get("original_name") or path.name,
        content_disposition_type="inline",
        headers={"Cache-Control": "no-store"},
    )


@legacy_router.get("/{video_id}/script", response_class=PlainTextResponse)
def script(video_id: str, user: dict = Depends(current_user)):
    return get_script(video_id)
