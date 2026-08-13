import json
import re
import shutil
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from fastapi import UploadFile
from app.core.config import settings
from app.database.db import get_conn, new_id, now_iso
from app.services.rag_service import retrieve
from app.services.slm_service import ask_ollama
from app.utils.text_utils import sentence_summary, extract_formula

VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv"}
MIME_BY_EXT = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
}


def _duration_from_size(size_bytes: int) -> str:
    mb = size_bytes / (1024 * 1024)
    return f"Uploaded · {mb:.1f} MB"


def youtube_embed_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        raise ValueError("YouTube URL is required")
    parsed = urlparse(raw)
    host = parsed.netloc.lower().replace("www.", "")
    video_id = ""
    if host in {"youtube.com", "m.youtube.com"}:
        if parsed.path.startswith("/watch"):
            video_id = parse_qs(parsed.query).get("v", [""])[0]
        elif parsed.path.startswith("/shorts/") or parsed.path.startswith("/embed/"):
            video_id = parsed.path.split("/")[2] if len(parsed.path.split("/")) > 2 else ""
    elif host == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0]
    if not re.match(r"^[A-Za-z0-9_-]{6,}$", video_id):
        raise ValueError("Enter a valid YouTube video link")
    return f"https://www.youtube.com/embed/{video_id}"


def _api_video(r: dict) -> dict:
    try:
        points = json.loads(r.get("important_points_json") or "[]")
    except Exception:
        points = []
    source_type = r.get("source_type") or r.get("video_type") or ("Uploaded" if r.get("file_path") else "Generated")
    video_type = (r.get("video_type") or ("youtube" if r.get("embed_url") else "upload" if r.get("file_path") else "generated")).lower()
    url = r.get("embed_url") or r.get("url") or (f"/api/video/{r['id']}/stream" if r.get("file_path") else f"/api/video/{r['id']}/script")
    return {
        "id": r["id"],
        "chapterId": r.get("chapter_id"),
        "topicId": r.get("topic_id") or "top-101",
        "title": r["title"],
        "description": r.get("description") or r.get("summary") or "",
        "duration": r.get("duration") or ("YouTube" if video_type == "youtube" else "Video"),
        "url": url,
        "summary": r.get("summary") or r.get("description") or "Uploaded by administrator and mapped to this topic.",
        "importantPoints": points,
        "sourceType": source_type,
        "videoType": video_type,
        "youtubeUrl": r.get("youtube_url"),
        "embedUrl": r.get("embed_url"),
        "filePath": r.get("file_path"),
        "originalName": r.get("original_name") or r.get("title"),
        "sizeBytes": r.get("size_bytes") or 0,
        "mimeType": r.get("mime_type") or "text/plain",
        "status": r.get("status") or "Ready",
        "createdAt": r.get("created_at"),
    }


def list_videos(topic_id: str | None = None, chapter_id: str | None = None) -> list[dict]:
    params = []
    sql = "SELECT * FROM videos WHERE 1=1"
    if topic_id and topic_id != "all":
        sql += " AND topic_id=?"; params.append(topic_id)
    if chapter_id and chapter_id != "all":
        sql += " AND chapter_id=?"; params.append(chapter_id)
    sql += " ORDER BY created_at DESC"
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [_api_video(dict(r)) for r in rows]


async def save_topic_video(file: UploadFile, topic_id: str, title: str | None = None, chapter_id: str | None = None, description: str | None = None) -> dict:
    if not topic_id:
        raise ValueError("Select a detected topic before uploading video")
    if not file.filename:
        raise ValueError("Video file name is missing")
    ext = Path(file.filename).suffix.lower()
    if ext not in VIDEO_EXTENSIONS:
        raise ValueError("Only video files are allowed: mp4, webm, mov, m4v, avi, mkv")

    safe_name = Path(file.filename).name.replace("/", "_").replace("\\", "_")
    video_id = new_id("vid")
    target_dir = settings.video_dir / "topic_videos"
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / f"{video_id}_{safe_name}"
    with target_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    size_bytes = target_path.stat().st_size
    if size_bytes > settings.max_video_upload_mb * 1024 * 1024:
        target_path.unlink(missing_ok=True)
        raise ValueError(f"Video too large. Maximum allowed is {settings.max_video_upload_mb} MB")

    mime_type = file.content_type or MIME_BY_EXT.get(ext, "application/octet-stream")
    display_title = title.strip() if title and title.strip() else safe_name
    summary = description or "Uploaded by administrator and mapped to this topic. Students will see this video under the selected topic."
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO videos(id,chapter_id,topic_id,title,duration,url,summary,description,important_points_json,script_path,file_path,original_name,size_bytes,mime_type,source_type,status,video_type,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                video_id, chapter_id, topic_id, display_title, _duration_from_size(size_bytes), f"/api/video/{video_id}/stream",
                summary, description, json.dumps(["Uploaded video", "Mapped to topic", "Playable inside student page"]),
                None, str(target_path), safe_name, size_bytes, mime_type, "Uploaded", "Ready", "upload", now_iso(),
            ),
        )
        row = conn.execute("SELECT * FROM videos WHERE id=?", (video_id,)).fetchone()
    return _api_video(dict(row))


def save_youtube_video(topic_id: str, title: str, youtube_url: str, chapter_id: str | None = None, description: str | None = None) -> dict:
    if not topic_id:
        raise ValueError("Select a topic")
    if not title or not title.strip():
        raise ValueError("Video title is required")
    embed = youtube_embed_url(youtube_url)
    video_id = new_id("vid")
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO videos(id,chapter_id,topic_id,title,duration,url,summary,description,important_points_json,script_path,file_path,original_name,size_bytes,mime_type,source_type,status,video_type,youtube_url,embed_url,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                video_id, chapter_id, topic_id, title.strip(), "YouTube", embed, description or "YouTube video mapped to this topic.",
                description, json.dumps(["YouTube embedded video", "Mapped by administrator", "Plays inside app"]),
                None, None, None, 0, "text/html", "YouTube", "Ready", "youtube", youtube_url, embed, now_iso(),
            ),
        )
        row = conn.execute("SELECT * FROM videos WHERE id=?", (video_id,)).fetchone()
    return _api_video(dict(row))


def delete_video(video_id: str) -> bool:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM videos WHERE id=?", (video_id,)).fetchone()
        if not row:
            return False
        file_path = row["file_path"]
        conn.execute("DELETE FROM videos WHERE id=?", (video_id,))
    if file_path:
        try:
            Path(file_path).unlink(missing_ok=True)
        except Exception:
            pass
    return True


def get_video_file(video_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM videos WHERE id=?", (video_id,)).fetchone()
    if not row:
        return None
    data = dict(row)
    if not data.get("file_path"):
        return None
    return data


def generate_video(topic_id: str, title: str | None = None) -> dict:
    chunks = retrieve(topic_id.replace("top-", ""), top_k=5, topic_id=topic_id)
    context = "\n\n".join(c.get("chunk_text", "") for c in chunks)
    topic = chunks[0].get("topic") if chunks else title or "Physics Topic"
    title = title or f"AI Topic Video Script: {topic}"
    script = ask_ollama(
        f"Create a 5-scene 12th Physics video script for topic {topic}. Use this content: {context[:2500]}",
        max_tokens=768,
    )
    if not script:
        summary = sentence_summary(context, topic, 4) or "This topic is explained using definitions, formula, example and exam tip."
        formula = extract_formula(context) or "Important formula will be shown from NCERT context."
        script = f"""Scene 1: Title - {topic}\nExplain what the topic means in simple board-exam language.\n\nScene 2: Concept\n{summary}\n\nScene 3: Formula Focus\nFormula: {formula}\nExplain each symbol and unit.\n\nScene 4: Exam Example\nShow a short 2-mark or 5-mark answer pattern from this topic.\n\nScene 5: Revision Summary\nRepeat definition, formula, and one common mistake to avoid."""
    video_id = new_id("vid")
    script_path = settings.video_dir / "scripts" / f"{video_id}.txt"
    script_path.write_text(script, encoding="utf-8")
    important = [line.replace("Scene", "Step").strip() for line in script.splitlines() if line.lower().startswith("scene")][:5]
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO videos(id,topic_id,title,duration,url,summary,important_points_json,script_path,file_path,original_name,size_bytes,mime_type,source_type,status,video_type,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                video_id, topic_id, title, "4:00", f"/api/video/{video_id}/script", sentence_summary(script, topic, 2),
                json.dumps(important), str(script_path), None, None, 0, "text/plain", "Generated", "Generated", "generated", now_iso(),
            ),
        )
        row = conn.execute("SELECT * FROM videos WHERE id=?", (video_id,)).fetchone()
    return _api_video(dict(row))


def get_script(video_id: str) -> str:
    with get_conn() as conn:
        row = conn.execute("SELECT script_path, summary FROM videos WHERE id=?", (video_id,)).fetchone()
    if not row or not row["script_path"]:
        return "Video script not found. Upload a real topic video or add a YouTube link from Administrator > Video Management."
    p = Path(row["script_path"])
    if p.exists():
        return p.read_text(encoding="utf-8")
    return row["summary"] or "Generated video script."
