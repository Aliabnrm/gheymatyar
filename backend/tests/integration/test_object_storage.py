import os
from uuid import uuid4

import boto3
import pytest

from app.core.config import Settings
from app.modules.price_lists.infrastructure.s3_document_storage import (
    create_s3_document_storage,
)


@pytest.mark.anyio
async def test_s3_integration_preserves_original_object_bytes() -> None:
    if os.environ.get("RUN_OBJECT_STORAGE_INTEGRATION") != "1":
        pytest.skip("set RUN_OBJECT_STORAGE_INTEGRATION=1 when the test MinIO bucket is ready")

    settings = Settings(
        app_env="test",
        s3_endpoint_url=os.environ.get("TEST_S3_ENDPOINT_URL", "http://localhost:9000"),
        s3_bucket=os.environ.get("TEST_S3_BUCKET", "gheymatyar-source-documents"),
        s3_access_key=os.environ.get("TEST_S3_ACCESS_KEY", "gheymatyar"),
        s3_secret_key=os.environ.get("TEST_S3_SECRET_KEY", "local-development-only"),
    )
    storage = create_s3_document_storage(settings)
    key = f"integration-tests/{uuid4()}.xlsx"
    content = b"PK\x03\x04integration-object"
    inspection_client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key.get_secret_value(),
        aws_secret_access_key=settings.s3_secret_key.get_secret_value(),
        region_name=settings.s3_region,
    )
    try:
        await storage.put(
            object_key=key,
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response = inspection_client.get_object(Bucket=settings.s3_bucket, Key=key)
        assert response["Body"].read() == content
    finally:
        await storage.delete(object_key=key)
        inspection_client.close()
        await storage.close()
