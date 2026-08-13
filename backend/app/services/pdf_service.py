import json
import re
import shutil
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.database.db import get_conn, new_id, now_iso
from app.utils.text_utils import (
    clean_text,
    chunk_text,
    keywords,
    slugify,
    filename_to_chapter,
    detect_page_heading,
    detect_chapter_from_page,
)
from app.services.vector_service import (
    rebuild_index,
    add_upload_to_index,
    add_paper_questions_to_index,
)


try:
    import fitz  # PyMuPDF
except Exception:  # pragma: no cover
    try:
        import pymupdf as fitz
    except Exception:
        fitz = None


# ============================================================
# Helpers
# ============================================================

def _format_size(size_bytes: int) -> str:
    mb = size_bytes / (1024 * 1024)

    if mb >= 0.1:
        return f"{mb:.1f} MB"

    return f"{size_bytes / 1024:.1f} KB"


def _logs(row: dict) -> list[str]:
    try:
        return json.loads(
            row.get("pipeline_log_json") or "[]"
        )
    except Exception:
        return []


def _api_file(row: dict) -> dict:
    chapters = []

    try:
        chapters = json.loads(
            row.get("extracted_chapters_json") or "[]"
        )
    except Exception:
        pass

    return {
        "id": row["id"],
        "name": row["name"],
        "originalName": (
            row.get("original_name")
            or row["name"]
        ),
        "size": _format_size(
            row["size_bytes"]
        ),
        "sizeBytes": row["size_bytes"],
        "type": row["type"],
        "uploadedAt": (
            row["uploaded_at"]
            .replace("T", " ")[:16]
        ),
        "status": row["status"],
        "progress": row["progress"],
        "pagesCount": (
            row.get("pages_count")
            or 0
        ),
        "chunksCount": (
            row.get("chunks_count")
            or 0
        ),
        "questionsCount": (
            row.get("questions_count")
            or 0
        ),
        "extractedChapters": chapters,
        "pipelineLog": _logs(row),
        "errorMessage": row.get(
            "error_message"
        ),
        "viewUrl": (
            f"/api/pdf/{row['id']}/view"
        ),
    }


def _append_log(
    conn,
    upload_id: str,
    message: str,
) -> None:

    row = conn.execute(
        """
        SELECT pipeline_log_json
        FROM uploads
        WHERE id=?
        """,
        (upload_id,),
    ).fetchone()

    logs = []

    if row:
        try:
            logs = json.loads(
                row["pipeline_log_json"]
                or "[]"
            )
        except Exception:
            logs = []

    logs.append(
        f"{now_iso()} | {message}"
    )

    conn.execute(
        """
        UPDATE uploads
        SET pipeline_log_json=?
        WHERE id=?
        """,
        (
            json.dumps(
                logs[-80:]
            ),
            upload_id,
        ),
    )


def _set_status(
    conn,
    upload_id: str,
    status: str,
    progress: int,
    message: str | None = None,
) -> None:

    conn.execute(
        """
        UPDATE uploads
        SET status=?, progress=?
        WHERE id=?
        """,
        (
            status,
            progress,
            upload_id,
        ),
    )

    if message:
        _append_log(
            conn,
            upload_id,
            message,
        )


# ============================================================
# Upload handling
# ============================================================

async def save_upload(
    file: UploadFile,
    pdf_type: str = "Knowledge PDF",
    uploaded_by: str | None = None,
) -> dict:

    if (
        not file.filename
        or not file.filename
        .lower()
        .endswith(".pdf")
    ):
        raise ValueError(
            "Only PDF files are allowed"
        )

    upload_id = new_id("file")

    safe_name = (
        Path(file.filename)
        .name
        .replace("/", "_")
        .replace("\\", "_")
    )

    normalized_type = (
        "Knowledge PDF"
        if "knowledge" in pdf_type.lower()
        else "Question Paper PDF"
    )

    target_dir = (
        settings.knowledge_pdf_dir
        if normalized_type
        == "Knowledge PDF"
        else settings.question_paper_dir
    )

    target_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    target_path = (
        target_dir
        / f"{upload_id}_{safe_name}"
    )

    with target_path.open("wb") as f:
        shutil.copyfileobj(
            file.file,
            f,
        )

    size_bytes = (
        target_path.stat().st_size
    )

    if (
        size_bytes
        > settings.max_upload_mb
        * 1024
        * 1024
    ):
        target_path.unlink(
            missing_ok=True
        )

        raise ValueError(
            f"PDF too large. Maximum allowed is "
            f"{settings.max_upload_mb} MB"
        )

    with get_conn() as conn:

        conn.execute(
            """
            INSERT INTO uploads(
                id,
                name,
                original_name,
                file_path,
                size_bytes,
                type,
                uploaded_by,
                uploaded_at,
                status,
                progress,
                pipeline_log_json
            )
            VALUES(
                ?,?,?,?,?,?,?,?,?,?,?
            )
            """,
            (
                upload_id,
                safe_name,
                safe_name,
                str(target_path),
                size_bytes,
                normalized_type,
                uploaded_by,
                now_iso(),
                "Uploaded",
                0,
                json.dumps(
                    [
                        f"{now_iso()} | "
                        f"Upload received: "
                        f"{safe_name}"
                    ]
                ),
            ),
        )

        row = conn.execute(
            """
            SELECT *
            FROM uploads
            WHERE id=?
            """,
            (upload_id,),
        ).fetchone()

        return _api_file(
            dict(row)
        )


def list_uploads(
    pdf_type: str | None = None,
) -> list[dict]:

    sql = """
    SELECT *
    FROM uploads
    """

    params = []

    if pdf_type:
        sql += " WHERE type=?"
        params.append(pdf_type)

    sql += """
    ORDER BY uploaded_at DESC
    """

    with get_conn() as conn:
        rows = conn.execute(
            sql,
            params,
        ).fetchall()

        return [
            _api_file(dict(r))
            for r in rows
        ]


def get_upload(
    upload_id: str,
) -> dict | None:

    with get_conn() as conn:

        row = conn.execute(
            """
            SELECT *
            FROM uploads
            WHERE id=?
            """,
            (upload_id,),
        ).fetchone()

        return (
            dict(row)
            if row
            else None
        )


# ============================================================
# PDF extraction
# ============================================================

def extract_pdf_pages(
    file_path: str,
) -> list[dict]:
    """
    Extract PDF text page-by-page.

    sort=True improves reading order for textbook PDFs.
    """

    if fitz is None:
        raise RuntimeError(
            "PyMuPDF is not installed. "
            "Run pip install -r requirements.txt"
        )

    doc = fitz.open(file_path)

    pages = []

    try:
        for i, page in enumerate(
            doc,
            start=1,
        ):

            raw_text = (
                page.get_text(
                    "text",
                    sort=True,
                )
                or ""
            )

            text = clean_text(
                raw_text
            )

            if text.strip():
                pages.append(
                    {
                        "page": i,
                        "text": text,
                    }
                )

    finally:
        doc.close()

    return pages


# ============================================================
# Topic detection helpers
# ============================================================

def _extract_topics_from_page(
    text: str,
    default_topic: str,
) -> list[str]:

    candidates = []

    for line in text.splitlines()[:80]:

        line = re.sub(
            r"\s+",
            " ",
            line.strip(),
        )

        if (
            detect_page_heading(line)
            and "chapter"
            not in line.lower()
        ):
            candidates.append(line)

        elif re.match(
            r"^\d+(?:\.\d+)+\s+.{4,80}$",
            line,
        ):
            candidates.append(line)

    seen = set()
    out = []

    for candidate in candidates:

        candidate = re.sub(
            r"^\d+(?:\.\d+)+\s*",
            "",
            candidate,
        ).strip(" :-")

        lower = candidate.lower()

        if (
            candidate
            and lower not in seen
        ):
            out.append(
                candidate[:90]
            )

            seen.add(lower)

    return (
        out[:3]
        or [default_topic]
    )


def _sections_from_page(
    text: str,
    default_topic: str,
    current_topic: str | None = None,
) -> tuple[list[dict], str]:
    """
    Split each PDF page into textbook sections.

    Fixes:
    - keeps topic continuity across pages
    - preserves text before a new heading
    - uses only numbered NCERT-style section headings
    """

    if not text or not text.strip():

        topic = (
            current_topic
            or default_topic
        )

        return [], topic

    raw_lines = [
        re.sub(
            r"\s+",
            " ",
            line.strip(),
        )
        for line
        in text.splitlines()
        if line.strip()
    ]

    if not raw_lines:

        topic = (
            current_topic
            or default_topic
        )

        return [], topic

    ignore = {
        "physics",
        "exercises",
        "summary",
        "points to ponder",
        "answers",
        "chapter",
        "appendix",
        "semiconductor electronics",
        "materials devices and simple circuits",
        "and simple circuits",
    }

    headings: list[
        tuple[int, str, str]
    ] = []

    for idx, line in enumerate(
        raw_lines
    ):

        cleaned = (
            line.strip(" :-")
        )

        if (
            cleaned.lower()
            in ignore
        ):
            continue

        match = re.match(
            r"^(\d{1,2}"
            r"(?:\.\d{1,2}){1,3})"
            r"\s+(.{3,110})$",
            cleaned,
        )

        if not match:
            continue

        section_number = (
            match.group(1)
        )

        title = re.sub(
            r"\s+",
            " ",
            match.group(2),
        ).strip(" :-")

        if len(title) < 4:
            continue

        if (
            title.lower()
            in ignore
        ):
            continue

        if (
            len(title.split())
            > 14
        ):
            continue

        headings.append(
            (
                idx,
                section_number,
                title[:90],
            )
        )

    # --------------------------------------------------------
    # No numbered heading on the page
    # --------------------------------------------------------

    if not headings:

        topic = (
            current_topic
            or default_topic
        )

        return [
            {
                "topic": topic,
                "subtopic": topic,
                "text": (
                    "\n".join(
                        raw_lines
                    ).strip()
                ),
            }
        ], topic

    sections = []

    # --------------------------------------------------------
    # Text BEFORE first heading
    #
    # This text normally continues the previous page's topic.
    # --------------------------------------------------------

    first_heading_index = (
        headings[0][0]
    )

    if first_heading_index > 0:

        prefix_lines = (
            raw_lines[
                :first_heading_index
            ]
        )

        prefix_text = (
            "\n".join(
                prefix_lines
            ).strip()
        )

        if prefix_text:

            prefix_topic = (
                current_topic
                or default_topic
            )

            sections.append(
                {
                    "topic": prefix_topic,
                    "subtopic": prefix_topic,
                    "text": prefix_text,
                }
            )

    last_topic = (
        current_topic
        or default_topic
    )

    # --------------------------------------------------------
    # Numbered textbook sections
    # --------------------------------------------------------

    for pos, (
        line_idx,
        section_number,
        title,
    ) in enumerate(headings):

        if (
            pos + 1
            < len(headings)
        ):
            next_idx = (
                headings[
                    pos + 1
                ][0]
            )

        else:
            next_idx = len(
                raw_lines
            )

        body_lines = (
            raw_lines[
                line_idx + 1:
                next_idx
            ]
        )

        body_text = (
            "\n".join(
                body_lines
            ).strip()
        )

        if body_text:
            section_text = (
                f"{title}\n\n"
                f"{body_text}"
            )
        else:
            section_text = title

        sections.append(
            {
                "topic": title,
                "subtopic": title,
                "section_number": (
                    section_number
                ),
                "text": (
                    section_text.strip()
                ),
            }
        )

        last_topic = title

    return (
        sections,
        last_topic,
    )


# ============================================================
# Question paper processing
# ============================================================

def _question_paper_process(
    conn,
    upload_id: str,
    pages: list[dict],
) -> int:

    from app.services.question_service import (
        extract_questions_from_upload,
    )

    full_text = "\n".join(
        p["text"]
        for p in pages
    )

    conn.execute(
        """
        DELETE FROM questions
        WHERE paper_id=?
        """,
        (upload_id,),
    )

    return extract_questions_from_upload(
        conn,
        upload_id,
        full_text,
    )


# ============================================================
# Main PDF ingestion pipeline
# ============================================================

def process_upload(
    upload_id: str,
) -> dict:

    upload = get_upload(
        upload_id
    )

    if not upload:
        raise ValueError(
            "File not found"
        )

    try:
        # ----------------------------------------------------
        # Extract PDF
        # ----------------------------------------------------

        with get_conn() as conn:

            _set_status(
                conn,
                upload_id,
                "Extracting",
                15,
                (
                    "PyMuPDF page-wise text "
                    "extraction started"
                ),
            )

        pages = extract_pdf_pages(
            upload["file_path"]
        )

        pages_with_text = [
            p
            for p in pages
            if p["text"].strip()
        ]

        if not pages_with_text:
            raise ValueError(
                "No selectable text found. "
                "This looks like scanned PDF. "
                "OCR module is required "
                "for this file."
            )

        # ----------------------------------------------------
        # Store extracted page text
        # ----------------------------------------------------

        with get_conn() as conn:

            conn.execute(
                """
                DELETE FROM pdf_pages
                WHERE upload_id=?
                """,
                (upload_id,),
            )

            for page in pages_with_text:

                conn.execute(
                    """
                    INSERT INTO pdf_pages(
                        id,
                        upload_id,
                        page_number,
                        text
                    )
                    VALUES(?,?,?,?)
                    """,
                    (
                        new_id("page"),
                        upload_id,
                        page["page"],
                        page["text"],
                    ),
                )

            _set_status(
                conn,
                upload_id,
                "Structuring",
                35,
                (
                    f"Extracted "
                    f"{len(pages_with_text)} "
                    f"pages with selectable text"
                ),
            )

        # ====================================================
        # QUESTION PAPER PDF
        # ====================================================

        if (
            upload["type"]
            == "Question Paper PDF"
        ):

            with get_conn() as conn:

                q_count = (
                    _question_paper_process(
                        conn,
                        upload_id,
                        pages_with_text,
                    )
                )

                conn.execute(
                    """
                    UPDATE uploads
                    SET
                        status=?,
                        progress=?,
                        pages_count=?,
                        questions_count=?,
                        processed_at=?
                    WHERE id=?
                    """,
                    (
                        "Ready",
                        100,
                        len(
                            pages_with_text
                        ),
                        q_count,
                        now_iso(),
                        upload_id,
                    ),
                )

                _append_log(
                    conn,
                    upload_id,
                    (
                        "Question paper "
                        "extraction completed: "
                        f"{q_count} questions stored"
                    ),
                )

                row = conn.execute(
                    """
                    SELECT *
                    FROM uploads
                    WHERE id=?
                    """,
                    (upload_id,),
                ).fetchone()

            index_info = (
                add_paper_questions_to_index(
                    upload_id
                )
            )

            with get_conn() as conn:

                if not index_info.get(
                    "ok"
                ):
                    _append_log(
                        conn,
                        upload_id,
                        (
                            "Warning: Vector "
                            "indexing failed: "
                            f"{index_info.get('message')}"
                        ),
                    )

                else:
                    _append_log(
                        conn,
                        upload_id,
                        (
                            "Vector index rebuilt "
                            f"with "
                            f"{index_info.get('chunks', 0)} "
                            "chunks"
                        ),
                    )

                row = conn.execute(
                    """
                    SELECT *
                    FROM uploads
                    WHERE id=?
                    """,
                    (upload_id,),
                ).fetchone()

            return _api_file(
                dict(row)
            )

        # ====================================================
        # KNOWLEDGE PDF
        # ====================================================

        filename_ch_id, filename_chapter = (
            filename_to_chapter(
                upload.get(
                    "original_name"
                )
                or upload["name"]
            )
        )

        chapter_state = (
            filename_ch_id,
            filename_chapter,
        )

        # Keeps current topic between PDF pages
        topic_state: str | None = None

        all_chapters: dict[
            str,
            str,
        ] = {}

        chunk_count = 0

        topics_seen: set[str] = set()

        with get_conn() as conn:

            conn.execute(
                """
                DELETE FROM rag_chunks
                WHERE upload_id=?
                """,
                (upload_id,),
            )

            _set_status(
                conn,
                upload_id,
                "Chunking",
                50,
                (
                    "Chapter/topic/subtopic "
                    "detection and chunking started"
                ),
            )

            # ------------------------------------------------
            # Process each page
            # ------------------------------------------------

            for page in pages_with_text:

                detected_chapter = (
                    detect_chapter_from_page(
                        page["text"]
                    )
                )

                if detected_chapter:

                    if (
                        detected_chapter
                        != chapter_state
                    ):
                        topic_state = None

                    chapter_state = (
                        detected_chapter
                    )

                (
                    chapter_id,
                    chapter_title,
                ) = chapter_state

                all_chapters[
                    chapter_id
                ] = chapter_title

                # --------------------------------------------
                # Detect sections and retain topic across pages
                # --------------------------------------------

                (
                    sections,
                    topic_state,
                ) = _sections_from_page(
                    page["text"],
                    default_topic=(
                        f"{chapter_title} "
                        "- Key Concepts"
                    ),
                    current_topic=(
                        topic_state
                    ),
                )

                for section in sections:

                    topic_title = (
                        section.get(
                            "topic"
                        )
                        or topic_state
                        or (
                            f"{chapter_title} "
                            "- Key Concepts"
                        )
                    )

                    if (
                        topic_title
                        .lower()
                        .startswith(
                            "chapter"
                        )
                    ):
                        topic_title = (
                            "Key Concepts"
                        )

                    topic_id = slugify(
                        (
                            f"{chapter_id}-"
                            f"{topic_title}"
                        ),
                        "top",
                    )

                    subtopic_title = (
                        section.get(
                            "subtopic"
                        )
                        or topic_title
                    )

                    subtopic_id = slugify(
                        (
                            f"{topic_id}-"
                            f"{subtopic_title}"
                        ),
                        "sub",
                    )

                    topics_seen.add(
                        topic_id
                    )

                    section_text = (
                        section.get(
                            "text"
                        )
                        or page["text"]
                    )

                    # ----------------------------------------
                    # Chunk section using new 450 / 80 config
                    # ----------------------------------------

                    page_chunks = (
                        chunk_text(
                            section_text,
                            settings.chunk_size,
                            settings.chunk_overlap,
                        )
                    )

                    for chunk_text_value in page_chunks:

                        cleaned_chunk = (
                            chunk_text_value.strip()
                        )

                        # Ignore tiny noise chunks
                        if (
                            len(cleaned_chunk)
                            < 40
                        ):
                            continue

                        conn.execute(
                            """
                            INSERT INTO rag_chunks(
                                id,
                                upload_id,
                                upload_name,
                                chapter_id,
                                chapter,
                                topic_id,
                                topic,
                                subtopic_id,
                                subtopic,
                                page_number,
                                chunk_index,
                                chunk_text,
                                keywords_json,
                                created_at
                            )
                            VALUES(
                                ?,?,?,?,?,?,?,?,?,?,?,?,?,?
                            )
                            """,
                            (
                                new_id(
                                    "chunk"
                                ),
                                upload_id,
                                upload["name"],
                                chapter_id,
                                chapter_title,
                                topic_id,
                                topic_title,
                                subtopic_id,
                                subtopic_title,
                                page["page"],
                                chunk_count,
                                cleaned_chunk,
                                json.dumps(
                                    keywords(
                                        cleaned_chunk,
                                        12,
                                    )
                                ),
                                now_iso(),
                            ),
                        )

                        chunk_count += 1

            _set_status(
                conn,
                upload_id,
                "Embedding",
                72,
                (
                    f"Created {chunk_count} "
                    f"text chunks across "
                    f"{len(topics_seen)} topics"
                ),
            )

        # ----------------------------------------------------
        # Add only this upload to vector index
        # ----------------------------------------------------

        index_info = (
            add_upload_to_index(
                upload_id
            )
        )

        with get_conn() as conn:

            if not index_info.get(
                "ok"
            ):

                _set_status(
                    conn,
                    upload_id,
                    "Failed",
                    0,
                    (
                        index_info.get(
                            "message"
                        )
                        or "Indexing failed"
                    ),
                )

                raise ValueError(
                    index_info.get(
                        "message"
                    )
                    or (
                        "Vector indexing "
                        "failed"
                    )
                )

            _set_status(
                conn,
                upload_id,
                "Indexing",
                92,
                (
                    "Vector index updated: "
                    f"{index_info.get('chunks', 0)} "
                    "chunks available"
                ),
            )

            conn.execute(
                """
                UPDATE uploads
                SET
                    status=?,
                    progress=?,
                    pages_count=?,
                    chunks_count=?,
                    extracted_chapters_json=?,
                    processed_at=?,
                    error_message=NULL
                WHERE id=?
                """,
                (
                    "Ready",
                    100,
                    len(
                        pages_with_text
                    ),
                    chunk_count,
                    json.dumps(
                        list(
                            all_chapters
                            .values()
                        )
                    ),
                    now_iso(),
                    upload_id,
                ),
            )

            _append_log(
                conn,
                upload_id,
                (
                    "Knowledge PDF is ready "
                    "for student RAG, chapter "
                    "view, topic view and "
                    "PDF viewer"
                ),
            )

            row = conn.execute(
                """
                SELECT *
                FROM uploads
                WHERE id=?
                """,
                (upload_id,),
            ).fetchone()

        return _api_file(
            dict(row)
        )

    except Exception as exc:

        with get_conn() as conn:

            conn.execute(
                """
                UPDATE uploads
                SET
                    status=?,
                    progress=?,
                    error_message=?
                WHERE id=?
                """,
                (
                    "Failed",
                    0,
                    str(exc),
                    upload_id,
                ),
            )

            _append_log(
                conn,
                upload_id,
                f"ERROR: {exc}",
            )

        raise


# ============================================================
# Delete question paper upload
# ============================================================

def delete_upload(
    upload_id: str,
) -> bool:

    upload = get_upload(
        upload_id
    )

    if not upload:
        raise ValueError(
            "File not found"
        )

    if (
        upload["type"]
        != "Question Paper PDF"
    ):
        raise ValueError(
            "Only Question Paper uploads "
            "can be removed"
        )

    with get_conn() as conn:

        conn.execute(
            """
            DELETE FROM questions
            WHERE paper_id=?
            """,
            (upload_id,),
        )

        conn.execute(
            """
            DELETE FROM uploads
            WHERE id=?
            """,
            (upload_id,),
        )

    try:
        if upload.get(
            "file_path"
        ):
            Path(
                upload["file_path"]
            ).unlink(
                missing_ok=True
            )
    except Exception:
        pass

    try:
        rebuild_index()
    except Exception:
        pass

    return True


# ============================================================
# Chapters
# ============================================================

def chapters() -> list[dict]:

    with get_conn() as conn:

        rows = conn.execute(
            """
            SELECT
                r.chapter_id,
                r.chapter,
                MIN(r.page_number) page_start,
                MAX(r.page_number) page_end,
                COUNT(*) chunks,
                COUNT(DISTINCT r.topic_id) topics,
                MIN(r.upload_id) upload_id,
                MIN(r.upload_name) upload_name,
                MAX(u.pages_count) pages_count,
                COUNT(DISTINCT q.id) questions_count,
                COUNT(DISTINCT v.id) videos_count

            FROM rag_chunks r

            JOIN uploads u
                ON u.id = r.upload_id

            LEFT JOIN questions q
                ON q.chapter_id = r.chapter_id

            LEFT JOIN videos v
                ON (
                    v.chapter_id = r.chapter_id
                    OR
                    v.topic_id = r.topic_id
                )

            WHERE
                u.type='Knowledge PDF'
                AND
                u.status='Ready'

            GROUP BY
                r.chapter_id,
                r.chapter

            ORDER BY
                MIN(u.uploaded_at) DESC,
                page_start
            """
        ).fetchall()

    out = []

    for i, row in enumerate(
        rows,
        start=1,
    ):

        out.append(
            {
                "id": (
                    row["chapter_id"]
                ),
                "number": i,
                "title": (
                    row["chapter"]
                ),
                "description": (
                    f"From "
                    f"{row['upload_name']}. "
                    f"{row['topics']} topics, "
                    f"{row['chunks']} chunks "
                    "stored in the local "
                    "vector database."
                ),
                "completionRate": 0,
                "masteryScore": 0,
                "topicsCount": (
                    row["topics"]
                    or 0
                ),
                "videosCount": (
                    row["videos_count"]
                    or 0
                ),
                "testsCount": (
                    row["questions_count"]
                    or 0
                ),
                "questionsGeneratedCount": (
                    row["questions_count"]
                    or 0
                ),
                "status": "Ready",
                "uploadId": (
                    row["upload_id"]
                ),
                "uploadName": (
                    row["upload_name"]
                ),
                "pdfViewUrl": (
                    f"/api/pdf/"
                    f"{row['upload_id']}/view"
                ),
                "pageStart": (
                    row["page_start"]
                    or 1
                ),
                "pageEnd": (
                    row["page_end"]
                    or 1
                ),
                "totalPages": (
                    row["pages_count"]
                    or row["page_end"]
                    or 1
                ),
                "chunksCount": (
                    row["chunks"]
                ),
            }
        )

    return out


# ============================================================
# Topics
# ============================================================

def topics(
    chapter_id: str | None = None,
    upload_id: str | None = None,
) -> list[dict]:

    sql = """
        SELECT
            r.topic_id,
            r.topic,
            r.chapter_id,
            r.chapter,
            r.upload_id,
            r.upload_name,

            MIN(r.page_number) page_start,
            MAX(r.page_number) page_end,

            MIN(r.chunk_index) first_chunk_index,

            COUNT(*) chunks,
            COUNT(DISTINCT r.subtopic_id) subtopics,
            COUNT(DISTINCT v.id) videos_count,
            COUNT(DISTINCT q.id) questions_count

        FROM rag_chunks r

        LEFT JOIN videos v
            ON v.topic_id = r.topic_id

        LEFT JOIN questions q
            ON q.topic_id = r.topic_id

        WHERE 1=1
    """

    params = []

    if (
        chapter_id
        and chapter_id != "all"
    ):
        sql += """
        AND r.chapter_id=?
        """

        params.append(
            chapter_id
        )

    if (
        upload_id
        and upload_id != "all"
    ):
        sql += """
        AND r.upload_id=?
        """

        params.append(
            upload_id
        )

    sql += """
        GROUP BY
            r.topic_id,
            r.topic,
            r.chapter_id,
            r.chapter,
            r.upload_id,
            r.upload_name

        ORDER BY
            page_start,
            first_chunk_index
    """

    with get_conn() as conn:

        rows = conn.execute(
            sql,
            params,
        ).fetchall()

    return [
        {
            "id": row["topic_id"],
            "chapterId": (
                row["chapter_id"]
            ),
            "chapterTitle": (
                row["chapter"]
            ),
            "uploadId": (
                row["upload_id"]
            ),
            "uploadName": (
                row["upload_name"]
            ),
            "title": (
                row["topic"]
            ),
            "description": (
                f"{row['chunks']} indexed "
                f"chunks, "
                f"{row['subtopics']} "
                "detected subtopics."
            ),
            "pageStart": (
                row["page_start"]
                or 1
            ),
            "pageEnd": (
                row["page_end"]
                or row["page_start"]
                or 1
            ),
            "subtopicsCount": (
                row["subtopics"]
            ),
            "keyPoints": [],
            "formula": "",
            "videoGenerated": bool(
                row["videos_count"]
            ),
            "videosCount": (
                row["videos_count"]
                or 0
            ),
            "videoDuration": "3:00",
            "questionsCount": (
                row["questions_count"]
                or 0
            ),
            "masteryScore": 0,
        }
        for row in rows
    ]


# ============================================================
# Subtopics
# ============================================================

def subtopics(
    topic_id: str,
) -> list[dict]:

    with get_conn() as conn:

        rows = conn.execute(
            """
            SELECT
                subtopic_id,
                subtopic,
                topic_id,
                topic,
                chapter_id,
                chapter,
                upload_id,

                MIN(page_number)
                    page_start,

                MAX(page_number)
                    page_end,

                COUNT(*)
                    chunks

            FROM rag_chunks

            WHERE topic_id=?

            GROUP BY
                subtopic_id,
                subtopic,
                topic_id,
                topic,
                chapter_id,
                chapter,
                upload_id

            ORDER BY
                page_start
            """,
            (topic_id,),
        ).fetchall()

    return [
        {
            "id": (
                row["subtopic_id"]
            ),
            "title": (
                row["subtopic"]
            ),
            "topicId": (
                row["topic_id"]
            ),
            "chapterId": (
                row["chapter_id"]
            ),
            "uploadId": (
                row["upload_id"]
            ),
            "pageStart": (
                row["page_start"]
            ),
            "pageEnd": (
                row["page_end"]
            ),
            "chunksCount": (
                row["chunks"]
            ),
        }
        for row in rows
    ]


# ============================================================
# Latest active knowledge PDF
# ============================================================

def active_knowledge() -> dict | None:

    with get_conn() as conn:

        row = conn.execute(
            """
            SELECT *
            FROM uploads
            WHERE
                type='Knowledge PDF'
                AND
                status='Ready'
            ORDER BY
                processed_at DESC
            LIMIT 1
            """
        ).fetchone()

    return (
        _api_file(
            dict(row)
        )
        if row
        else None
    )