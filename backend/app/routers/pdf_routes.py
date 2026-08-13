from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from app.core.dependencies import admin_user, current_user
from app.services import pdf_service
from app.database.db import get_conn

router = APIRouter(prefix="/pdf", tags=["pdf"])


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), type: str = Form("Knowledge PDF"), user: dict = Depends(admin_user)):
    try:
        return await pdf_service.save_upload(file, type, user.get("id"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/list")
def list_pdfs(type: str | None = None, user: dict = Depends(current_user)):
    return pdf_service.list_uploads(type)


@router.post("/{file_id}/process")
def process_pdf(file_id: str, user: dict = Depends(admin_user)):
    try:
        return pdf_service.process_upload(file_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{file_id}/view")
def view_pdf(file_id: str):
    upload = pdf_service.get_upload(file_id)
    if not upload:
        raise HTTPException(status_code=404, detail="PDF not found")
    # IMPORTANT: inline stops browser from downloading the PDF when opened in the iframe.
    return FileResponse(
        upload["file_path"],
        media_type="application/pdf",
        filename=upload.get("original_name") or upload["name"],
        content_disposition_type="inline",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/chapters")
def get_chapters(user: dict = Depends(current_user)):
    return pdf_service.chapters()


@router.get("/topics")
def get_topics(chapter_id: str | None = None, upload_id: str | None = None, user: dict = Depends(current_user)):
    return pdf_service.topics(chapter_id, upload_id)


@router.get("/subtopics")
def get_subtopics(topic_id: str, user: dict = Depends(current_user)):
    return pdf_service.subtopics(topic_id)


@router.get("/page-text")
def page_text(upload_id: str, page_number: int, user: dict = Depends(current_user)):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT page_number, text FROM pdf_pages WHERE upload_id=? AND page_number=?",
            (upload_id, page_number),
        ).fetchone()
    if not row:
        return {"uploadId": upload_id, "pageNumber": page_number, "text": ""}
    return {"uploadId": upload_id, "pageNumber": row["page_number"], "text": row["text"]}


@router.get("/topic/{topic_id}/chunks")
def topic_chunks(topic_id: str, user: dict = Depends(current_user)):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, upload_id, chapter, topic, subtopic, page_number, chunk_index, chunk_text
            FROM rag_chunks
            WHERE topic_id=?
            ORDER BY page_number, chunk_index
            """,
            (topic_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/active-knowledge")
def active_knowledge(user: dict = Depends(current_user)):
    return pdf_service.active_knowledge() or {}

@router.delete("/{file_id}")
def delete_pdf(file_id: str, user: dict = Depends(admin_user)):
    try:
        pdf_service.delete_upload(file_id)
        return {"message": "PDF removed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
