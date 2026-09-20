"""Common dependencies for FastAPI endpoints: database sessions and RBAC authentication."""

from typing import Callable, List, Optional
import uuid
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_async_db, get_db
from app.core.security import decode_access_token
from app.models.entities import User

# OAuth2 scheme pointing to our token endpoint
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/token",
    auto_error=True,
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate Bearer JWT and retrieve the corresponding User entity."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id_raw: Optional[str] = payload.get("sub")
        if not user_id_raw:
            raise credentials_exception
        user_id = UUID(str(user_id_raw))
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    return user


def require_roles(allowed_roles: List[str]) -> Callable[[User], User]:
    """Dependency factory enforcing role-based access control (RBAC).

    ADMIN role always possesses superuser privileges and is unconditionally authorized.
    Otherwise, the user's role must match one of the allowed_roles.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # ADMIN has full access across all endpoints
        if current_user.role == "ADMIN":
            return current_user

        if current_user.role in allowed_roles:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Operation not permitted. Required roles: {allowed_roles}. "
                f"Your active role is '{current_user.role}'."
            ),
        )

    return role_checker


# Convenience role dependency instances matching Section 4.1 / project doc
require_viewer = require_roles(["VIEWER", "TEACHER", "ML_ENGINEER", "ADMIN"])
require_teacher = require_roles(["TEACHER", "ADMIN"])
require_ml_engineer = require_roles(["ML_ENGINEER", "ADMIN"])
require_admin = require_roles(["ADMIN"])

__all__ = [
    "get_db",
    "get_async_db",
    "oauth2_scheme",
    "get_current_user",
    "require_roles",
    "require_viewer",
    "require_teacher",
    "require_ml_engineer",
    "require_admin",
]
