"""Seed standard role accounts into the database for authentication testing and demonstrations."""

import sys
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from typing import TypedDict

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.entities import User


# WHY: Typed dictionary defining the schema for default seed user records to ensure strict IDE static type checking
class SeedUser(TypedDict):
    id: uuid.UUID
    email: str
    password: str
    role: str


# WHY: Pre-configured test accounts representing each tier of the 4-tier RBAC security hierarchy for immediate viva evaluation
DEFAULT_USERS: list[SeedUser] = [
    {
        "id": uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        "email": "admin@aes.local",
        "password": "Admin123!",
        "role": "ADMIN",
    },
    {
        "id": uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        "email": "teacher@aes.local",
        "password": "Teacher123!",
        "role": "TEACHER",
    },
    {
        "id": uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        "email": "ml_engineer@aes.local",
        "password": "Engineer123!",
        "role": "ML_ENGINEER",
    },
    {
        "id": uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd"),
        "email": "viewer@aes.local",
        "password": "Viewer123!",
        "role": "VIEWER",
    },
]


# WHY: Seeds or refreshes bcrypt password hashes for standard accounts on fresh database migrations
def seed_users():
    session = SessionLocal()
    try:
        for u in DEFAULT_USERS:
            existing = session.query(User).filter(User.email == u["email"]).first()
            raw_password = str(u["password"])
            user_role = str(u["role"])
            if existing:
                existing.password_hash = get_password_hash(raw_password)
                existing.role = user_role
                print(f"Updated user: {u['email']} ({user_role})")
            else:
                new_user = User(
                    id=u["id"],
                    email=u["email"],
                    password_hash=get_password_hash(raw_password),
                    role=user_role,
                )
                session.add(new_user)
                print(f"Created user: {u['email']} ({user_role})")
        session.commit()
        print("Successfully seeded all 4 role accounts!")
    except Exception as e:
        session.rollback()
        print(f"Error seeding users: {e}")
        raise e
    finally:
        session.close()


if __name__ == "__main__":
    seed_users()
