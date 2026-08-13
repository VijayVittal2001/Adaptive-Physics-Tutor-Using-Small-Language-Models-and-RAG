import shutil
from pathlib import Path
from fastapi import UploadFile

from app.core.config import settings
from app.database.db import get_conn, new_id, now_iso


def save_html_module(file: UploadFile, chapter: str, topic: str, subtopic: str | None = None, module_type: str = "visualization") -> dict:
    if not file.filename or not file.filename.lower().endswith(".html"):
        raise ValueError("Only HTML files are allowed")

    module_id = new_id("html")
    safe_name = Path(file.filename).name.replace("/", "_").replace("\\", "_")
    target_path = settings.html_modules_dir / f"{module_id}_{safe_name}"

    with target_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    with get_conn() as conn:
        # Check if one already exists for this exact chapter, topic, and subtopic
        sql_check = "SELECT id, file_path FROM interactive_modules WHERE chapter=? AND topic=? AND module_type=?"
        params_check = [chapter, topic, module_type]
        if subtopic:
            sql_check += " AND subtopic=?"
            params_check.append(subtopic)
        else:
            sql_check += " AND (subtopic IS NULL OR subtopic='')"
            
        existing = conn.execute(sql_check, params_check).fetchone()
        
        if existing:
            # delete old file
            try:
                Path(existing["file_path"]).unlink(missing_ok=True)
            except Exception:
                pass
            conn.execute("DELETE FROM interactive_modules WHERE id=?", (existing["id"],))

        conn.execute(
            """
            INSERT INTO interactive_modules(id, chapter, topic, subtopic, file_path, original_name, uploaded_at, module_type)
            VALUES(?,?,?,?,?,?,?,?)
            """,
            (module_id, chapter, topic, subtopic, str(target_path), safe_name, now_iso(), module_type),
        )
        row = conn.execute("SELECT * FROM interactive_modules WHERE id=?", (module_id,)).fetchone()
        return dict(row)


def list_html_modules(chapter: str | None = None, module_type: str | None = None) -> list[dict]:
    sql = "SELECT * FROM interactive_modules WHERE 1=1"
    params = []
    if chapter and chapter != "all":
        sql += " AND chapter=?"
        params.append(chapter)
    if module_type:
        sql += " AND module_type=?"
        params.append(module_type)
    sql += " ORDER BY uploaded_at ASC"
    
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]


def get_html_module(module_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM interactive_modules WHERE id=?", (module_id,)).fetchone()
        return dict(row) if row else None
