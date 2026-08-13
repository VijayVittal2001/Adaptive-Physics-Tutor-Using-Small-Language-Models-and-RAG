import os
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.dependencies import admin_user, current_user
from app.services import diagram_service

router = APIRouter(prefix="/diagrams", tags=["Diagrams"])

@router.post("/tasks/upload")
async def upload_diagram_task(
    chapter: str = Form(...),
    topic: str = Form(...),
    task_description: str = Form(...),
    file: UploadFile | None = None,
    user: dict = Depends(admin_user),
):
    try:
        task = diagram_service.save_diagram_task(chapter, topic, task_description, file)
        return {"ok": True, "task": task}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tasks")
def list_diagram_tasks(
    chapter: str | None = None,
    user: dict = Depends(current_user),
):
    return {"ok": True, "data": diagram_service.get_diagram_tasks(chapter)}

class DiagramSubmissionRequest(BaseModel):
    topic_id: str
    task_id: str
    image_base64: str

@router.post("/submissions")
def submit_diagram(
    req: DiagramSubmissionRequest,
    user: dict = Depends(current_user),
):
    try:
        sub = diagram_service.save_diagram_submission(user["id"], req.topic_id, req.task_id, req.image_base64)
        return {"ok": True, "submission": sub}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tasks/{task_id}/reference")
def view_reference_image(task_id: str):
    tasks = diagram_service.get_diagram_tasks()
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task or not task.get("reference_image_path") or not os.path.exists(task["reference_image_path"]):
        raise HTTPException(status_code=404, detail="Reference image not found")
    return FileResponse(task["reference_image_path"])
