"""Unit and integration tests for StorageService using moto."""

import io
import sys
from pathlib import Path
import pytest
from moto import mock_aws

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.storage import StorageService


@pytest.fixture
def s3_storage():
    """Fixture providing a mock S3 StorageService instance with bucket created."""
    with mock_aws():
        service = StorageService(
            endpoint_url=None,  # Use moto AWS S3 default
            bucket_name="test-essay-documents",
            access_key="test-access-key",
            secret_key="test-secret-key",
            region_name="us-east-1",
        )
        service.ensure_bucket_exists()
        yield service


def test_bucket_creation(s3_storage):
    """Verify ensure_bucket_exists idempotency and bucket presence."""
    # Calling it again should not raise errors
    s3_storage.ensure_bucket_exists()
    response = s3_storage.s3_client.list_buckets()
    bucket_names = [b["Name"] for b in response.get("Buckets", [])]
    assert "test-essay-documents" in bucket_names


def test_upload_and_download_roundtrip(s3_storage):
    """Verify uploading bytes and downloading them yields exact content match."""
    content = b"The quick brown fox jumps over the lazy dog."
    key = "essays/student_001/essay_submission.txt"

    storage_key = s3_storage.upload_file(
        file_bytes=content,
        key=key,
        content_type="text/plain",
    )
    assert storage_key == key

    # Confirm object exists
    assert s3_storage.file_exists(storage_key) is True

    # Download and assert content round-trip
    downloaded_bytes = s3_storage.download_file(storage_key)
    assert downloaded_bytes == content


def test_upload_fileobj_roundtrip(s3_storage):
    """Verify uploading a BytesIO stream round-trips correctly."""
    content = b"Draft revision text in binary stream."
    key = "submissions/draft_v1.bin"
    stream = io.BytesIO(content)

    storage_key = s3_storage.upload_file(file_bytes=stream, key=key)
    assert storage_key == key

    downloaded = s3_storage.download_file(key)
    assert downloaded == content


def test_get_presigned_url(s3_storage):
    """Verify presigned URL generation for uploaded object."""
    content = b"Presigned document payload."
    key = "documents/summary.pdf"
    s3_storage.upload_file(file_bytes=content, key=key, content_type="application/pdf")

    url = s3_storage.get_presigned_url(storage_key=key, expires_in=1800)
    assert isinstance(url, str)
    assert key in url or "summary.pdf" in url
    assert "X-Amz-Signature" in url or "AWSAccessKeyId" in url or "Signature" in url


def test_delete_file(s3_storage):
    """Verify deleting an uploaded file removes it from storage."""
    key = "temp/temporary_file.txt"
    s3_storage.upload_file(file_bytes=b"delete me", key=key)
    assert s3_storage.file_exists(key) is True

    deleted = s3_storage.delete_file(key)
    assert deleted is True
    assert s3_storage.file_exists(key) is False


def test_file_exists_not_found(s3_storage):
    """Verify file_exists returns False for non-existent key."""
    assert s3_storage.file_exists("non_existent_key_12345.txt") is False
