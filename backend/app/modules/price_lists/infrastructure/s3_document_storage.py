from dataclasses import dataclass
from typing import Any, Protocol, cast

import boto3
from anyio import to_thread
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import Settings

from ..application.import_ports import DocumentStorage
from ..domain.import_errors import PriceListImportError, PriceListImportErrorCode


class _S3Client(Protocol):
    def get_object(self, *, Bucket: str, Key: str) -> dict[str, Any]: ...

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str) -> object: ...

    def delete_object(self, *, Bucket: str, Key: str) -> object: ...

    def head_bucket(self, *, Bucket: str) -> object: ...

    def close(self) -> None: ...


@dataclass(slots=True)
class S3DocumentStorage(DocumentStorage):
    client: _S3Client
    bucket: str

    async def get(self, *, object_key: str, max_bytes: int) -> bytes:
        def read() -> bytes:
            response = self.client.get_object(Bucket=self.bucket, Key=object_key)
            body = response["Body"]
            try:
                content = cast(bytes, body.read(max_bytes + 1))
                if len(content) > max_bytes:
                    raise OSError("Stored document exceeds limit")
                return content
            finally:
                body.close()

        try:
            return await to_thread.run_sync(read)
        except (BotoCoreError, ClientError, OSError) as exc:
            raise PriceListImportError(
                PriceListImportErrorCode.OBJECT_STORAGE_UNAVAILABLE,
                "خواندن فایل اصلی ممکن نیست؛ کمی بعد دوباره تلاش کنید.",
            ) from exc

    async def put(self, *, object_key: str, content: bytes, media_type: str) -> None:
        try:
            await to_thread.run_sync(
                lambda: self.client.put_object(
                    Bucket=self.bucket,
                    Key=object_key,
                    Body=content,
                    ContentType=media_type,
                )
            )
        except (BotoCoreError, ClientError, OSError) as exc:
            raise PriceListImportError(
                PriceListImportErrorCode.OBJECT_STORAGE_UNAVAILABLE,
                "فضای نگهداری فایل در دسترس نیست؛ کمی بعد دوباره تلاش کنید.",
            ) from exc

    async def delete(self, *, object_key: str) -> None:
        try:
            await to_thread.run_sync(
                lambda: self.client.delete_object(Bucket=self.bucket, Key=object_key)
            )
        except (BotoCoreError, ClientError, OSError) as exc:
            raise PriceListImportError(
                PriceListImportErrorCode.OBJECT_STORAGE_UNAVAILABLE,
                "پاک‌سازی فایل ناقص در فضای نگهداری انجام نشد.",
            ) from exc

    async def ping(self) -> None:
        try:
            await to_thread.run_sync(lambda: self.client.head_bucket(Bucket=self.bucket))
        except (BotoCoreError, ClientError, OSError) as exc:
            raise RuntimeError("Object storage is unavailable") from exc

    async def close(self) -> None:
        await to_thread.run_sync(self.client.close)


def create_s3_document_storage(settings: Settings) -> S3DocumentStorage:
    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key.get_secret_value(),
        aws_secret_access_key=settings.s3_secret_key.get_secret_value(),
        region_name=settings.s3_region,
        config=Config(
            connect_timeout=settings.s3_connect_timeout_seconds,
            read_timeout=settings.s3_read_timeout_seconds,
            retries={"max_attempts": 2, "mode": "standard"},
            signature_version="s3v4",
        ),
    )
    return S3DocumentStorage(client=cast(_S3Client, client), bucket=settings.s3_bucket)
