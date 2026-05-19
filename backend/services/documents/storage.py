import os
from uuid import uuid4

import boto3
from botocore.config import Config

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
BUCKET = os.getenv("S3_BUCKET", "keel-documents")
PRESIGN_EXPIRY = 3600  # 1 hour


def _client():
    return boto3.client(
        "s3",
        endpoint_url=MINIO_ENDPOINT,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def upload_file(file_bytes: bytes, filename: str, content_type: str, company_id: str) -> str:
    key = f"{company_id}/{uuid4()}/{filename}"
    _client().put_object(
        Bucket=BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return key


def presign_url(file_key: str) -> str:
    try:
        return _client().generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": file_key},
            ExpiresIn=PRESIGN_EXPIRY,
        )
    except Exception:
        return ""


def delete_file(file_key: str) -> None:
    try:
        _client().delete_object(Bucket=BUCKET, Key=file_key)
    except Exception:
        pass
