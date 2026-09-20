"""Pydantic validation schemas for authentication and tokens."""

from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    email: str = Field(..., description="Registered user email address")
    password: str = Field(..., min_length=1, description="Raw plaintext password")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Signed JWT Bearer access token")
    token_type: str = Field("bearer", description="Token authorization type")
    role: str = Field(..., description="User role (ADMIN, TEACHER, ML_ENGINEER, VIEWER)")
    email: str = Field(..., description="User email address")
    user_id: UUID = Field(..., description="User unique identifier")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UserResponse(BaseModel):
    id: UUID = Field(..., description="User unique identifier")
    email: str = Field(..., description="User email address")
    role: str = Field(..., description="User role (ADMIN, TEACHER, ML_ENGINEER, VIEWER)")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
