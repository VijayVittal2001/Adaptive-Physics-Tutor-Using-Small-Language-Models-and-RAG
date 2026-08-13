import os
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.dependencies import admin_user, current_user
from app.services import html_service

router = APIRouter(prefix="/html", tags=["HTML Modules"])


@router.post("/upload")
async def upload_html(
    file: UploadFile,
    chapter: str = Form(...),
    topic: str = Form(...),
    subtopic: str | None = Form(None),
    module_type: str = Form("visualization"),
    user: dict = Depends(admin_user),
):
    try:
        module = html_service.save_html_module(file, chapter, topic, subtopic, module_type)
        return {"ok": True, "module": module}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/list")
def list_html_modules(
    chapter: str | None = None,
    module_type: str | None = None,
    user: dict = Depends(current_user),
):
    return {"ok": True, "data": html_service.list_html_modules(chapter, module_type)}


@router.get("/{module_id}/view")
def view_html_module(module_id: str):
    module = html_service.get_html_module(module_id)
    if not module or not os.path.exists(module["file_path"]):
        raise HTTPException(status_code=404, detail="HTML module not found")
    return FileResponse(module["file_path"], media_type="text/html")
