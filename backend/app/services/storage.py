"""Storage service wrapping boto3 for S3/MinIO compatible object storage."""

import io
import logging
from typing import BinaryIO, Optional, Union
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


_DEFAULT = object()


class StorageService:
    """Service wrapper for S3-compatible object storage (e.g. MinIO or AWS S3)."""

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
        self.s3_client = boto3.client(
            "s3",
            region_name=self.region_name,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            endpoint_url=endpoint,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},  # Path-style addressing required for MinIO
            ),
        )

    def ensure_bucket_exists(self) -> None:
        """Create the target bucket if it does not already exist."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in ("404", "NoSuchBucket"):
                create_kwargs = {"Bucket": self.bucket_name}
                if self.region_name and self.region_name != "us-east-1":
                    create_kwargs["CreateBucketConfiguration"] = {
                        "LocationConstraint": self.region_name
                    }
                try:
                    self.s3_client.create_bucket(**create_kwargs)
                    logger.info(f"Created S3 bucket '{self.bucket_name}'.")
                except ClientError as create_exc:
                    create_err = create_exc.response.get("Error", {}).get("Code", "")
                    if create_err not in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
                        raise create_exc
            else:
                raise exc

    def upload_file(
        self,
        file_bytes: Union[bytes, BinaryIO, io.BytesIO],
        key: str,
        content_type: Optional[str] = None,
    ) -> str:
        """Upload raw bytes or file-like object to S3-compatible storage.

        Args:
            file_bytes: In-memory bytes or readable binary stream.
            key: Destination storage key / path inside the bucket.
            content_type: Optional MIME content type.

        Returns:
            The storage key under which the object is stored.
        """
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type

        # Normalize to file-like object
        if isinstance(file_bytes, bytes):
            stream: Union[BinaryIO, io.BytesIO] = io.BytesIO(file_bytes)
        else:
            stream = file_bytes

        # Rewind stream if seekable
        if hasattr(stream, "seek"):
            try:
                stream.seek(0)
            except Exception:
                pass

        try:
            self.s3_client.upload_fileobj(
                Fileobj=stream,
                Bucket=self.bucket_name,
                Key=key,
                ExtraArgs=extra_args if extra_args else None,
            )
            logger.info(f"Uploaded file to '{self.bucket_name}/{key}'.")
            return key
        except ClientError as exc:
            logger.error(f"Failed to upload file to S3 key '{key}': {exc}")
            raise exc

    def get_presigned_url(
        self,
        storage_key: str,
        expires_in: int = 3600,
        http_method: str = "get_object",
    ) -> str:
        """Generate a presigned URL for downloading or accessing a stored object.

        Args:
            storage_key: The storage key inside the bucket.
            expires_in: Expiration time in seconds (default: 3600).
            http_method: Client operation, typically 'get_object'.

        Returns:
            Presigned URL string.
        """
        try:
            url = self.s3_client.generate_presigned_url(
                ClientMethod=http_method,
                Params={
                    "Bucket": self.bucket_name,
                    "Key": storage_key,
                },
                ExpiresIn=expires_in,
            )
            return url
        except ClientError as exc:
            logger.error(f"Failed to generate presigned URL for '{storage_key}': {exc}")
            raise exc

    def download_file(self, storage_key: str) -> bytes:
        """Download object bytes from the storage bucket.

        Args:
            storage_key: The storage key inside the bucket.

        Returns:
            Raw bytes of the retrieved object.
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=storage_key,
            )
            return response["Body"].read()
        except ClientError as exc:
            logger.error(f"Failed to download S3 key '{storage_key}': {exc}")
            raise exc

    def delete_file(self, storage_key: str) -> bool:
        """Delete an object from the bucket.

        Args:
            storage_key: The storage key inside the bucket.

        Returns:
            True if deletion was issued.
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=storage_key,
            )
            return True
        except ClientError as exc:
            logger.error(f"Failed to delete S3 key '{storage_key}': {exc}")
            raise exc

    def file_exists(self, storage_key: str) -> bool:
        """Check if an object exists in the bucket."""
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=storage_key,
            )
            return True
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey"):
                return False
            raise exc
