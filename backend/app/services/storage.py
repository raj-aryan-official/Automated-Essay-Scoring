"""Storage service wrapping boto3 for S3/MinIO compatible object storage."""

import io
import logging
import os
from pathlib import Path
from typing import BinaryIO, Optional, Union
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)

LOCAL_STORAGE_DIR = Path(".storage")

_DEFAULT = object()


class StorageService:
    """Service wrapper for S3-compatible object storage (e.g. MinIO or AWS S3) with local fallback."""

    def __init__(
        self,
        endpoint_url: Union[str, None, object] = _DEFAULT,
        bucket_name: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        region_name: Optional[str] = None,
    ):
        if endpoint_url is _DEFAULT:
            self.endpoint_url = (
                getattr(settings, "S3_ENDPOINT", None)
                or getattr(settings, "S3_ENDPOINT_URL", None)
                or "http://localhost:9000"
            )
        else:
            self.endpoint_url = endpoint_url
        self.bucket_name = (
            bucket_name
            or getattr(settings, "S3_BUCKET", None)
            or getattr(settings, "S3_BUCKET_NAME", None)
            or "essay-documents"
        )
        self.access_key = (
            access_key
            or getattr(settings, "S3_ACCESS_KEY", None)
            or "minioadmin"
        )
        self.secret_key = (
            secret_key
            or getattr(settings, "S3_SECRET_KEY", None)
            or "minioadmin"
        )
        self.region_name = (
            region_name
            or getattr(settings, "S3_REGION", None)
            or "us-east-1"
        )

        endpoint = str(self.endpoint_url) if self.endpoint_url else None
        try:
            self.s3_client = boto3.client(
                "s3",
                region_name=self.region_name,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                endpoint_url=endpoint,
                config=Config(
                    signature_version="s3v4",
                    s3={"addressing_style": "path"},  # Path-style addressing required for MinIO
                    connect_timeout=1,
                    read_timeout=1,
                ),
            )
        except Exception:
            self.s3_client = None

    def ensure_bucket_exists(self) -> None:
        """Create the target bucket if it does not already exist."""
        client = self.s3_client
        if client is None:
            (LOCAL_STORAGE_DIR / self.bucket_name).mkdir(parents=True, exist_ok=True)
            return

        try:
            client.head_bucket(Bucket=self.bucket_name)
        except Exception as exc:
            error_code = ""
            if isinstance(exc, ClientError):
                error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in ("404", "NoSuchBucket"):
                create_kwargs = {"Bucket": self.bucket_name}
                if self.region_name and self.region_name != "us-east-1":
                    create_kwargs["CreateBucketConfiguration"] = {
                        "LocationConstraint": self.region_name
                    }
                try:
                    client.create_bucket(**create_kwargs)
                    logger.info(f"Created S3 bucket '{self.bucket_name}'.")
                except Exception as create_exc:
                    logger.warning(f"Could not create S3 bucket: {create_exc}. Using local directory.")
                    (LOCAL_STORAGE_DIR / self.bucket_name).mkdir(parents=True, exist_ok=True)
            else:
                (LOCAL_STORAGE_DIR / self.bucket_name).mkdir(parents=True, exist_ok=True)

    def upload_file(
        self,
        file_bytes: Union[bytes, BinaryIO, io.BytesIO],
        key: str,
        content_type: Optional[str] = None,
    ) -> str:
        """Upload raw bytes or file-like object to S3 or fallback to local storage."""
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        # Normalize to file-like object
        if isinstance(file_bytes, (bytes, bytearray)):
            raw_bytes = bytes(file_bytes)
            stream = io.BytesIO(raw_bytes)
        else:
            if hasattr(file_bytes, "seek"):
                try:
                    file_bytes.seek(0)
                except Exception:
                    pass
            try:
                raw_bytes = file_bytes.read()
                stream = io.BytesIO(raw_bytes)
            except Exception:
                raw_bytes = b""
                stream = io.BytesIO(b"")

        client = self.s3_client
        if client is not None:
            try:
                client.upload_fileobj(
                    stream,
                    self.bucket_name,
                    key,
                    ExtraArgs={"ContentType": content_type} if content_type else None,
                )
                logger.info(f"Uploaded file to '{self.bucket_name}/{key}'.")
                return key
            except Exception as exc:
                logger.warning(f"S3 upload failed ({exc}). Falling back to local storage for key '{key}'.")

        # Local filesystem fallback
        target = LOCAL_STORAGE_DIR / self.bucket_name / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw_bytes)
        logger.info(f"Persisted file locally to '{target}'.")
        return key

    def get_presigned_url(
        self,
        storage_key: str,
        expires_in: int = 3600,
        http_method: str = "get_object",
    ) -> str:
        """Generate a presigned URL or return fallback local path."""
        client = self.s3_client
        if client is not None:
            try:
                url = client.generate_presigned_url(
                    ClientMethod=http_method,
                    Params={
                        "Bucket": self.bucket_name,
                        "Key": storage_key,
                    },
                    ExpiresIn=expires_in,
                )
                return url
            except Exception as exc:
                logger.debug(f"S3 presigned URL generation failed: {exc}")

        return f"/api/v1/storage/{self.bucket_name}/{storage_key}"

    def download_file(self, storage_key: str) -> bytes:
        """Download object bytes from the storage bucket or local disk."""
        client = self.s3_client
        if client is not None:
            try:
                response = client.get_object(
                    Bucket=self.bucket_name,
                    Key=storage_key,
                )
                return response["Body"].read()
            except Exception as exc:
                logger.debug(f"S3 download failed: {exc}")

        target = LOCAL_STORAGE_DIR / self.bucket_name / storage_key
        if target.is_file():
            return target.read_bytes()
        raise FileNotFoundError(f"Storage key '{storage_key}' not found locally or in S3.")

    def delete_file(self, storage_key: str) -> bool:
        """Delete an object from the bucket.

        Args:
            storage_key: The storage key inside the bucket.

        Returns:
            True if deletion was issued.
        """
        client = self.s3_client
        if client is not None:
            try:
                client.delete_object(
                    Bucket=self.bucket_name,
                    Key=storage_key,
                )
                return True
            except ClientError as exc:
                logger.error(f"Failed to delete S3 key '{storage_key}': {exc}")
                raise exc

        target = LOCAL_STORAGE_DIR / self.bucket_name / storage_key
        if target.is_file():
            target.unlink()
            return True
        return False

    def file_exists(self, storage_key: str) -> bool:
        """Check if an object exists in the bucket."""
        client = self.s3_client
        if client is not None:
            try:
                client.head_object(
                    Bucket=self.bucket_name,
                    Key=storage_key,
                )
                return True
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey"):
                    return False
                raise exc

        target = LOCAL_STORAGE_DIR / self.bucket_name / storage_key
        return target.is_file()



def get_storage_service() -> StorageService:
    """Dependency provider returning an instance of StorageService."""
    return StorageService()
