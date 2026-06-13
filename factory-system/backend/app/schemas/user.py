"""사용자 / 인증 스키마."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.user import UserRole


class UserBase(BaseModel):
    username: str
    full_name: str = ""
    role: UserRole = UserRole.viewer
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    username: str
    password: str
