import json
from pathlib import Path
from typing import List, Union
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Base application metadata
    PROJECT_NAME: str = "Automated Essay Scoring"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server configuration
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # Authentication & Security
    JWT_SECRET: str = "replace_with_secure_random_secret_key"
    SECRET_KEY: str = "replace_with_secure_random_secret_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database URLs
    DATABASE_URL: str = "postgresql+asyncpg://aes_user:aes_password@localhost:5432/aes_db"
    DATABASE_SYNC_URL: str = "postgresql://aes_user:aes_password@localhost:5432/aes_db"

    # S3 / MinIO Object Storage
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_BUCKET: str = "essay-documents"
    S3_BUCKET_NAME: str = "essay-documents"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_REGION: str = "us-east-1"

    # CORS & Frontend Origin configuration
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @model_validator(mode="before")
    @classmethod
    def assemble_settings(cls, data: dict):
        if not isinstance(data, dict):
            return data

        # Harmonize S3_ENDPOINT and S3_ENDPOINT_URL
        default_s3_ep = "http://localhost:9000"
        s3_ep = data.get("S3_ENDPOINT") or data.get("s3_endpoint")
        s3_ep_url = data.get("S3_ENDPOINT_URL") or data.get("s3_endpoint_url")
        if s3_ep_url and s3_ep_url != default_s3_ep and (not s3_ep or s3_ep == default_s3_ep):
            s3_final_ep = s3_ep_url
        else:
            s3_final_ep = s3_ep or s3_ep_url
        if s3_final_ep:
            data["S3_ENDPOINT"] = s3_final_ep
            data["S3_ENDPOINT_URL"] = s3_final_ep

        # Harmonize S3_BUCKET and S3_BUCKET_NAME
        default_bucket = "essay-documents"
        s3_b = data.get("S3_BUCKET") or data.get("s3_bucket")
        s3_b_name = data.get("S3_BUCKET_NAME") or data.get("s3_bucket_name")
        if s3_b_name and s3_b_name != default_bucket and (not s3_b or s3_b == default_bucket):
            s3_final_b = s3_b_name
        else:
            s3_final_b = s3_b or s3_b_name
        if s3_final_b:
            data["S3_BUCKET"] = s3_final_b
            data["S3_BUCKET_NAME"] = s3_final_b

        # Harmonize JWT_SECRET and SECRET_KEY
        default_secret = "replace_with_secure_random_secret_key"
        jwt_sec = data.get("JWT_SECRET") or data.get("jwt_secret")
        sec_key = data.get("SECRET_KEY") or data.get("secret_key")
        if sec_key and sec_key != default_secret and (not jwt_sec or jwt_sec == default_secret):
            final_sec = sec_key
        else:
            final_sec = jwt_sec or sec_key
        if final_sec:
            data["JWT_SECRET"] = final_sec
            data["SECRET_KEY"] = final_sec

        # Ensure DATABASE_SYNC_URL is derived if not explicitly set or if still default while DATABASE_URL changed
        default_sync = "postgresql://aes_user:aes_password@localhost:5432/aes_db"
        default_async = "postgresql+asyncpg://aes_user:aes_password@localhost:5432/aes_db"
        db_url = (
            data.get("DATABASE_URL")
            or data.get("database_url")
            or default_async
        )
        db_sync = data.get("DATABASE_SYNC_URL") or data.get("database_sync_url")
        if not db_sync or (db_sync == default_sync and db_url != default_async):
            data["DATABASE_SYNC_URL"] = (
                db_url.replace("+asyncpg", "").replace("asyncpg://", "postgresql://")
            )

        # Parse BACKEND_CORS_ORIGINS if string
        cors = data.get("BACKEND_CORS_ORIGINS") or data.get("backend_cors_origins")
        if isinstance(cors, str):
            cors_str = cors.strip()
            if cors_str.startswith("[") and cors_str.endswith("]"):
                try:
                    data["BACKEND_CORS_ORIGINS"] = json.loads(cors_str)
                except Exception:
                    data["BACKEND_CORS_ORIGINS"] = [
                        item.strip().strip("'\"")
                        for item in cors_str.strip("[]").split(",")
                        if item.strip()
                    ]
            else:
                data["BACKEND_CORS_ORIGINS"] = [
                    item.strip().strip("'\"")
                    for item in cors_str.split(",")
                    if item.strip()
                ]

        return data

    @property
    def cors_origins(self) -> List[str]:
        """Returns normalized list of unique allowed CORS origins including FRONTEND_ORIGIN."""
        origins: List[str] = []
        if isinstance(self.BACKEND_CORS_ORIGINS, list):
            origins.extend(self.BACKEND_CORS_ORIGINS)
        elif isinstance(self.BACKEND_CORS_ORIGINS, str):
            origins.append(self.BACKEND_CORS_ORIGINS)

        if self.FRONTEND_ORIGIN and self.FRONTEND_ORIGIN not in origins:
            origins.append(self.FRONTEND_ORIGIN)

        # Normalize and remove trailing slashes for CORS matching
        normalized = []
        for origin in origins:
            cleaned = origin.rstrip("/")
            if cleaned and cleaned not in normalized:
                normalized.append(cleaned)
        return normalized

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="allow",
    )


settings = Settings()
