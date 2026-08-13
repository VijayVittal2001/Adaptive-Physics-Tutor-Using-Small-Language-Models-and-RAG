import shutil
import base64
from pathlib import Path
from fastapi import UploadFile

from app.core.config import settings
from app.database.db import get_conn, new_id, now_iso

def save_diagram_task(chapter: str, topic: str, task_description: str, file: UploadFile = None) -> dict:
    task_id = new_id("dtask")
    reference_path = None
    original_name = None
    
    if file and file.filename:
        safe_name = Path(file.filename).name.replace("/", "_").replace("\\", "_")
        target_path = settings.upload_dir / f"{task_id}_{safe_name}"
        
        with target_path.open("wb") as f:
            shutil.copyfileobj(file.file, f)
            
        reference_path = str(target_path)
        original_name = safe_name

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO diagram_tasks(id, chapter, topic, task_description, reference_image_path, original_name, uploaded_at)
            VALUES(?,?,?,?,?,?,?)
            """,
            (task_id, chapter, topic, task_description, reference_path, original_name, now_iso()),
        )
        row = conn.execute("SELECT * FROM diagram_tasks WHERE id=?", (task_id,)).fetchone()
        return dict(row)

def get_diagram_tasks(chapter: str | None = None) -> list[dict]:
    sql = "SELECT * FROM diagram_tasks"
    params = []
    if chapter and chapter != "all":
        sql += " WHERE chapter=?"
        params.append(chapter)
    sql += " ORDER BY uploaded_at DESC"
    
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]

def save_diagram_submission(student_id: str, topic_id: str, task_id: str, image_base64: str) -> dict:
    sub_id = new_id("dsub")
    
    # Extract base64
    header, encoded = image_base64.split(",", 1)
    file_ext = "png"
    if "jpeg" in header or "jpg" in header:
        file_ext = "jpg"
        
    image_data = base64.b64decode(encoded)
    target_path = settings.upload_dir / f"{sub_id}_submission.{file_ext}"
    
    with target_path.open("wb") as f:
        f.write(image_data)
        
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO diagram_submissions(id, student_id, topic_id, task_id, image_path, created_at)
            VALUES(?,?,?,?,?,?)
            """,
            (sub_id, student_id, topic_id, task_id, str(target_path), now_iso()),
        )
        row = conn.execute("SELECT * FROM diagram_submissions WHERE id=?", (sub_id,)).fetchone()
        return dict(row)
