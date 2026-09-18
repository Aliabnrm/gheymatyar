import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile

from ..domain.errors import PriceListError, PriceListErrorCode

MAX_ORIGINAL_FILENAME_LENGTH = 255
_CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")


@dataclass(frozen=True, slots=True)
class UploadedXlsx:
    filename: str
    content: bytes


def sanitize_filename(filename: str | None) -> str:
    normalized = unicodedata.normalize("NFKC", filename or "").replace("\\", "/")
    safe_name = _CONTROL_CHARACTERS.sub("_", Path(normalized).name)
    if len(safe_name) <= MAX_ORIGINAL_FILENAME_LENGTH:
        return safe_name
    suffix = Path(safe_name).suffix
    stem_limit = MAX_ORIGINAL_FILENAME_LENGTH - len(suffix)
    return f"{safe_name[:stem_limit]}{suffix}"


async def read_xlsx(upload: UploadFile, *, max_bytes: int) -> UploadedXlsx:
    filename = sanitize_filename(upload.filename)
    if Path(filename).suffix.casefold() != ".xlsx":
        raise PriceListError(
            PriceListErrorCode.INVALID_FILE_TYPE,
            "در نسخه فعلی فقط فایل XLSX پذیرفته می‌شود.",
            {"filename": filename},
        )
    content = await upload.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise PriceListError(
            PriceListErrorCode.FILE_TOO_LARGE,
            "حجم فایل بیشتر از محدودیت مجاز است.",
            {"max_bytes": max_bytes, "filename": filename},
        )
    if not content:
        raise PriceListError(
            PriceListErrorCode.EMPTY_FILE,
            "فایل انتخاب‌شده خالی است.",
            {"filename": filename},
        )
    return UploadedXlsx(filename=filename, content=content)
