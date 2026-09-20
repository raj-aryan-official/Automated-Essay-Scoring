"""Seed standard role accounts into the database for authentication testing and demonstrations."""

import sys
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.entities import User

DEFAULT_USERS = [
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


def seed_users():
    session = SessionLocal()
    try:
        for u in DEFAULT_USERS:
            existing = session.query(User).filter(User.email == u["email"]).first()
            if existing:
                existing.password_hash = get_password_hash(u["password"])
                existing.role = u["role"]
                print(f"Updated user: {u['email']} ({u['role']})")
            else:
                new_user = User(
                    id=u["id"],
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                )
                session.add(new_user)
                print(f"Created user: {u['email']} ({u['role']})")
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
