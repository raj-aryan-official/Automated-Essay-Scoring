from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt

# Fix passlib 1.7.4 compatibility with bcrypt >= 4.0.0 (Win ARM64 / modern wheels)
if not hasattr(bcrypt, "__about__"):

    class _About:
        __version__ = getattr(bcrypt, "__version__", "5.0.0")

    setattr(bcrypt, "__about__", _About())

_orig_hashpw = bcrypt.hashpw


# WHY: Bcrypt algorithms have a hard 72-byte input limit; we truncate oversized inputs to prevent DoS attacks and compatibility crashes
def _safe_hashpw(password, salt):
    if isinstance(password, (bytes, bytearray)) and len(password) > 72:
        password = password[:72]
    elif isinstance(password, str) and len(password.encode("utf-8")) > 72:
        password = password.encode("utf-8")[:72]
    return _orig_hashpw(password, salt)


bcrypt.hashpw = _safe_hashpw

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# WHY: We use bcrypt via passlib for adaptive, salted, slow-by-design password hashing resistant to rainbow table and brute-force attacks
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# WHY: Performs constant-time comparison of plaintext input against the stored salted bcrypt hash
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a raw password against its stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


# WHY: Automatically generates a cryptographic salt and hashes user passwords before persisting to PostgreSQL
def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash of a plain password."""
    return pwd_context.hash(password)


# WHY: Issues a cryptographically signed JWT containing user ID (sub) and role tier for stateless REST authorization
def create_access_token(
    subject: str | Any,
    role: str,
    email: str | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Encode user identity, role, and expiration into a signed JWT."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if email:
        to_encode["email"] = email

    # WHY: Signs the token with HS256 secret key to guarantee payload integrity against client-side tampering
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


# WHY: Validates the cryptographic signature and token expiration; throws JWTError if tampered with or expired
def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a signed JWT. Raises JWTError if invalid or expired."""
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
    )
