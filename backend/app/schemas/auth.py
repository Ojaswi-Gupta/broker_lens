"""Authentication schemas for request validation and response serialization."""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict

UserRole = Literal["DOCUMENTATION_EXECUTIVE", "DOCUMENTATION_MANAGER"]


class UserLoginRequest(BaseModel):
    email: str
    password: str


class DemoLoginRequest(BaseModel):
    role: UserRole


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
