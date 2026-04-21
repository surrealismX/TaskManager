from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from .. import models, schemas
from .users import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def _get_owned_project(db: Session, project_id: int, user_id: int) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != user_id:
        raise HTTPException(status_code=403, detail="No access to this project")
    return project


@router.post("/", response_model=schemas.TaskResponse)
def create_task(
    data: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_owned_project(db, data.project_id, current_user.id)

    task = models.Task(
        title=data.title,
        description=data.description,
        status=data.status or "todo",
        priority=data.priority or "medium",
        due_date=data.due_date,
        project_id=data.project_id,
        assigned_user_id=data.assigned_user_id,
        updated_at=datetime.utcnow(),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/", response_model=list[schemas.TaskResponse])
def list_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    project_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
):
    q = (
        db.query(models.Task)
        .join(models.Project, models.Task.project_id == models.Project.id)
        .filter(models.Project.owner_id == current_user.id)
    )

    if project_id is not None:
        q = q.filter(models.Task.project_id == project_id)
    if status is not None:
        q = q.filter(models.Task.status == status)
    if priority is not None:
        q = q.filter(models.Task.priority == priority)

    return q.order_by(models.Task.id.desc()).all()


@router.get("/{task_id}", response_model=schemas.TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .join(models.Project, models.Task.project_id == models.Project.id)
        .filter(models.Task.id == task_id, models.Project.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: int,
    data: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .join(models.Project, models.Task.project_id == models.Project.id)
        .filter(models.Task.id == task_id, models.Project.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if data.title is not None:
        task.title = data.title
    if data.description is not None:
        task.description = data.description
    if data.status is not None:
        task.status = data.status
    if data.priority is not None:
        task.priority = data.priority
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.assigned_user_id is not None:
        task.assigned_user_id = data.assigned_user_id

    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .join(models.Project, models.Task.project_id == models.Project.id)
        .filter(models.Task.id == task_id, models.Project.owner_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}