"""Pydantic validation schemas for authentication and tokens."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# WHY: Schema validating JSON authentication credentials for the login endpoint.
class LoginRequest(BaseModel):
    email: str = Field(..., description="Registered user email address")
    password: str = Field(..., min_length=1, description="Raw plaintext password")


# WHY: Bearer token response envelope returning signed JWT, user UUID, and active RBAC role for frontend session storage.
class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Signed JWT Bearer access token")
    token_type: str = Field("bearer", description="Token authorization type")
    role: str = Field(
        ..., description="User role (ADMIN, TEACHER, ML_ENGINEER, VIEWER)"
    )
    email: str = Field(..., description="User email address")
    user_id: UUID = Field(..., description="User unique identifier")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# WHY: Safe user identity representation returned by the /me profile endpoint without leaking salted password hashes.
class UserResponse(BaseModel):
    id: UUID = Field(..., description="User unique identifier")
    email: str = Field(..., description="User email address")
    role: str = Field(
        ..., description="User role (ADMIN, TEACHER, ML_ENGINEER, VIEWER)"
    )

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
