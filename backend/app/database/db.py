import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable
from app.core.config import settings
from app.core.security import hash_password


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


@contextmanager
def get_conn():
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.db_path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    data = dict(row)
    for key, value in list(data.items()):
        if isinstance(value, str) and key.endswith("_json"):
            try:
                data[key[:-5]] = json.loads(value)
            except Exception:
                data[key[:-5]] = value
    return data


def rows_to_dicts(rows: Iterable[sqlite3.Row]) -> list[dict[str, Any]]:
    return [row_to_dict(r) for r in rows]


def _has_column(conn: sqlite3.Connection, table: str, column: str) -> bool:
    return any(r["name"] == column for r in conn.execute(f"PRAGMA table_info({table})").fetchall())


def _add_column(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    if not _has_column(conn, table, column):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")


def init_db() -> None:
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
                password_hash TEXT NOT NULL,
                auth_provider TEXT DEFAULT 'local',
                email_verified INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_by TEXT,
                created_at TEXT NOT NULL,
                last_login_at TEXT
            );

            CREATE TABLE IF NOT EXISTS uploads (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                original_name TEXT,
                file_path TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('Knowledge PDF','Question Paper PDF')),
                uploaded_by TEXT,
                uploaded_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Uploaded',
                progress INTEGER NOT NULL DEFAULT 0,
                pages_count INTEGER DEFAULT 0,
                chunks_count INTEGER DEFAULT 0,
                questions_count INTEGER DEFAULT 0,
                extracted_chapters_json TEXT DEFAULT '[]',
                pipeline_log_json TEXT DEFAULT '[]',
                processed_at TEXT,
                error_message TEXT,
                FOREIGN KEY(uploaded_by) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS pdf_pages (
                id TEXT PRIMARY KEY,
                upload_id TEXT NOT NULL,
                page_number INTEGER NOT NULL,
                text TEXT NOT NULL,
                FOREIGN KEY(upload_id) REFERENCES uploads(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS rag_chunks (
                id TEXT PRIMARY KEY,
                upload_id TEXT NOT NULL,
                upload_name TEXT,
                chapter_id TEXT,
                chapter TEXT,
                topic_id TEXT,
                topic TEXT,
                subtopic_id TEXT,
                subtopic TEXT,
                page_number INTEGER,
                chunk_index INTEGER NOT NULL,
                chunk_text TEXT NOT NULL,
                keywords_json TEXT DEFAULT '[]',
                created_at TEXT NOT NULL,
                FOREIGN KEY(upload_id) REFERENCES uploads(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                paper_id TEXT,
                topic_id TEXT,
                chapter_id TEXT,
                text TEXT NOT NULL,
                marks INTEGER NOT NULL,
                difficulty TEXT NOT NULL,
                bloom_level TEXT NOT NULL,
                mapped_topic TEXT,
                model_answer TEXT,
                rubric_json TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY(paper_id) REFERENCES uploads(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS student_answers (
                id TEXT PRIMARY KEY,
                student_id TEXT,
                question_id TEXT,
                selected_option TEXT,
                answer_text TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS evaluation_results (
                id TEXT PRIMARY KEY,
                student_id TEXT,
                question_id TEXT,
                student_answer TEXT NOT NULL,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY,
                topic_id TEXT,
                title TEXT NOT NULL,
                duration TEXT,
                url TEXT,
                summary TEXT,
                important_points_json TEXT DEFAULT '[]',
                script_path TEXT,
                file_path TEXT,
                original_name TEXT,
                size_bytes INTEGER DEFAULT 0,
                mime_type TEXT,
                source_type TEXT DEFAULT 'Generated',
                status TEXT DEFAULT 'Generated',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS interactive_modules (
                id TEXT PRIMARY KEY,
                chapter TEXT NOT NULL,
                topic TEXT NOT NULL,
                file_path TEXT NOT NULL,
                original_name TEXT NOT NULL,
                uploaded_at TEXT NOT NULL,
                module_type TEXT DEFAULT 'visualization'
            );

            CREATE TABLE IF NOT EXISTS diagram_tasks (
                id TEXT PRIMARY KEY,
                chapter TEXT NOT NULL,
                topic TEXT NOT NULL,
                task_description TEXT NOT NULL,
                reference_image_path TEXT,
                original_name TEXT,
                uploaded_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS diagram_submissions (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                topic_id TEXT,
                task_id TEXT NOT NULL,
                image_path TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(task_id) REFERENCES diagram_tasks(id) ON DELETE CASCADE
            );
            """
        )
        # safe migrations for projects that already ran the earlier prototype
        for col, ddl in {
            "original_name": "TEXT",
            "pages_count": "INTEGER DEFAULT 0",
            "chunks_count": "INTEGER DEFAULT 0",
            "questions_count": "INTEGER DEFAULT 0",
            "pipeline_log_json": "TEXT DEFAULT '[]'",
            "error_message": "TEXT",
        }.items():
            _add_column(conn, "uploads", col, ddl)
        for col, ddl in {
            "email_verified": "INTEGER NOT NULL DEFAULT 0",
            "is_active": "INTEGER NOT NULL DEFAULT 1",
            "created_by": "TEXT",
            "last_login_at": "TEXT",
        }.items():
            _add_column(conn, "users", col, ddl)
        for col, ddl in {
            "upload_name": "TEXT",
            "subtopic_id": "TEXT",
            "subtopic": "TEXT",
        }.items():
            _add_column(conn, "rag_chunks", col, ddl)
        for col, ddl in {
            "subtopic_id": "TEXT",
            "question_type": "TEXT DEFAULT 'descriptive'",
            "option_a": "TEXT",
            "option_b": "TEXT",
            "option_c": "TEXT",
            "option_d": "TEXT",
            "correct_option": "TEXT",
            "explanation": "TEXT",
            "rubric_text": "TEXT",
            "keywords_text": "TEXT",
            "created_by": "TEXT",
            "image_path": "TEXT",
            "image_original_name": "TEXT",
            "image_mime_type": "TEXT",
            "solution_video_path": "TEXT",
            "solution_video_original_name": "TEXT",
            "solution_video_mime_type": "TEXT",
        }.items():
            _add_column(conn, "questions", col, ddl)
        for col, ddl in {
            "file_path": "TEXT",
            "original_name": "TEXT",
            "size_bytes": "INTEGER DEFAULT 0",
            "mime_type": "TEXT",
            "source_type": "TEXT DEFAULT 'Generated'",
            "chapter_id": "TEXT",
            "description": "TEXT",
            "video_type": "TEXT DEFAULT 'upload'",
            "youtube_url": "TEXT",
            "embed_url": "TEXT",
        }.items():
            _add_column(conn, "videos", col, ddl)
        for col, ddl in {
            "subtopic": "TEXT",
            "module_type": "TEXT DEFAULT 'visualization'",
        }.items():
            _add_column(conn, "interactive_modules", col, ddl)
        _seed_admin(conn)


def _seed_admin(conn: sqlite3.Connection) -> None:
    exists = conn.execute("SELECT id FROM users WHERE lower(email)=?", (settings.admin_email,)).fetchone()
    if not exists:
        conn.execute(
            """
            INSERT INTO users(id,name,email,role,password_hash,auth_provider,email_verified,is_active,created_at)
            VALUES(?,?,?,?,?,?,?,?,?)
            """,
            (
                "user-admin",
                settings.admin_name,
                settings.admin_email,
                "admin",
                hash_password(settings.admin_password),
                "local",
                1,
                1,
                now_iso(),
            ),
        )
