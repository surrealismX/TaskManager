from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional, Literal


# ---------- USERS ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str):
        # bcrypt limit: 72 bytes (важливо для кирилиці/емодзі)
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password too long (bcrypt limit is 72 bytes)")
        if len(v) < 6:
            raise ValueError("Password too short (min 6 chars)")
        return v


class UserResponse(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- PROJECTS ----------
class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str):
        if len(v.strip()) < 2:
            raise ValueError("Title too short")
        return v.strip()


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title_optional(cls, v: Optional[str]):
        if v is None:
            return v
        if len(v.strip()) < 2:
            raise ValueError("Title too short")
        return v.strip()


class ProjectResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    owner_id: int

    class Config:
        from_attributes = True


# ------- TASKS -------
TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    due_date: Optional[datetime] = None
    project_id: int
    assigned_user_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_task_title(cls, v: str):
        if len(v.strip()) < 2:
            raise ValueError("Title too short")
        return v.strip()


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    assigned_user_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_task_title_optional(cls, v: Optional[str]):
        if v is None:
            return v
        if len(v.strip()) < 2:
            raise ValueError("Title too short")
        return v.strip()


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime]
    project_id: int
    assigned_user_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ------- FINANCES -------
class FinanceCreate(BaseModel):
    amount: float
    type: str
    description: str

class FinanceResponse(BaseModel):
    id: int
    amount: float
    type: str
    description: str
    date: datetime

    class Config:
        from_attributes = True