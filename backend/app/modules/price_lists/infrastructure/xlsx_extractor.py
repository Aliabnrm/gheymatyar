from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from io import BytesIO
from time import monotonic
from typing import Literal, Protocol, runtime_checkable
from xml.etree.ElementTree import ParseError
from zipfile import BadZipFile, ZipFile

from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException
from openpyxl.workbook.workbook import Workbook

from ..application.mapping_dto import ExtractionReport
from ..domain.errors import PriceListError, PriceListErrorCode
from ..domain.mapping import ColumnMapping, detect_columns, normalize_header
from ..domain.models import PriceListItem
from ..domain.normalization import (
    map_availability,
    normalize_persian_text,
    normalize_product_code,
    normalize_product_name,
    parse_pack_size,
    parse_price_irr,
)


@runtime_checkable
class _ReadOnlySheet(Protocol):
    title: str

    @property
    def max_row(self) -> int | None: ...

    @property
    def max_column(self) -> int | None: ...

    def reset_dimensions(self) -> None: ...

    def iter_rows(
        self,
        min_row: int | None = None,
        max_row: int | None = None,
        min_col: int | None = None,
        max_col: int | None = None,
        *,
        values_only: Literal[True],
    ) -> Iterable[tuple[object, ...]]: ...


@dataclass(frozen=True, slots=True)
class XlsxExtractionLimits:
    max_processing_seconds: float = 15.0
    max_header_scan_rows: int = 20
    max_rows: int = 50_000
    max_columns: int = 200
    max_sheets: int = 20
    max_archive_entries: int = 10_000
    max_uncompressed_bytes: int = 100 * 1024 * 1024
    max_compression_ratio: float = 250.0

    def __post_init__(self) -> None:
        values = (
            self.max_header_scan_rows,
            self.max_rows,
            self.max_columns,
            self.max_sheets,
            self.max_archive_entries,
            self.max_uncompressed_bytes,
        )
        if (
            any(value < 1 for value in values)
            or self.max_compression_ratio < 1
            or self.max_processing_seconds <= 0
        ):
            raise ValueError("XLSX extraction limits must be positive")


class XlsxPriceListExtractor:
    def __init__(self, limits: XlsxExtractionLimits | None = None) -> None:
        self._limits = limits or XlsxExtractionLimits()

    def extract(self, content: bytes, *, filename: str) -> list[PriceListItem]:
        report = self.analyze(content, filename=filename)
        if report.error:
            raise report.error
        return report.items

    def analyze(
        self,
        content: bytes,
        *,
        filename: str,
        mapping: ColumnMapping | None = None,
        header_signature: tuple[str, ...] | None = None,
        sheet_name: str | None = None,
        header_row: int | None = None,
    ) -> ExtractionReport:
        deadline = monotonic() + self._limits.max_processing_seconds
        if not content.startswith(b"PK\x03\x04"):
            raise PriceListError(
                PriceListErrorCode.INVALID_XLSX_SIGNATURE,
                "محتوای فایل با فرمت XLSX معتبر مطابقت ندارد.",
                {"filename": filename},
            )

        self._validate_archive(content, filename=filename)

        try:
            workbook = load_workbook(
                filename=BytesIO(content),
                read_only=True,
                data_only=True,
                keep_links=False,
            )
        except (BadZipFile, InvalidFileException, OSError, ValueError, KeyError, ParseError) as exc:
            raise PriceListError(
                PriceListErrorCode.WORKBOOK_UNREADABLE,
                "فایل Excel قابل خواندن نیست یا آسیب دیده است.",
                {"filename": filename},
            ) from exc

        try:
            self._validate_workbook_dimensions(workbook)
            # XLSX dimension metadata is untrusted: it must not hide rows or columns.
            for sheet in self._read_only_worksheets(workbook):
                sheet.reset_dimensions()
            return self._analyze_workbook(
                workbook,
                mapping=mapping,
                header_signature=header_signature,
                sheet_name=sheet_name,
                header_row=header_row,
                deadline=deadline,
            )
        except (BadZipFile, OSError, ValueError, KeyError, ParseError) as exc:
            raise PriceListError(
                PriceListErrorCode.WORKBOOK_UNREADABLE,
                "فایل Excel قابل خواندن نیست یا آسیب دیده است.",
            ) from exc
        finally:
            workbook.close()

    def _validate_archive(self, content: bytes, *, filename: str) -> None:
        try:
            with ZipFile(BytesIO(content)) as archive:
                entries = archive.infolist()
        except BadZipFile as exc:
            raise PriceListError(
                PriceListErrorCode.WORKBOOK_UNREADABLE,
                "فایل Excel قابل خواندن نیست یا آسیب دیده است.",
                {"filename": filename},
            ) from exc

        if len(entries) > self._limits.max_archive_entries:
            raise self._archive_limit_error(filename)

        total_uncompressed = 0
        for entry in entries:
            if entry.flag_bits & 0x1:
                raise PriceListError(
                    PriceListErrorCode.ENCRYPTED_XLSX_NOT_SUPPORTED,
                    "فایل Excel رمزگذاری‌شده در این نسخه پشتیبانی نمی‌شود.",
                    {"filename": filename},
                )

            total_uncompressed += entry.file_size
            if total_uncompressed > self._limits.max_uncompressed_bytes:
                raise self._archive_limit_error(filename)

            if entry.file_size == 0:
                continue
            if entry.compress_size == 0:
                raise self._archive_limit_error(filename)
            compression_ratio = entry.file_size / entry.compress_size
            if compression_ratio > self._limits.max_compression_ratio:
                raise self._archive_limit_error(filename)

        try:
            with ZipFile(BytesIO(content)) as archive:
                content_types = archive.read("[Content_Types].xml")
                if (
                    b"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
                    not in content_types
                    or b"macroEnabled" in content_types
                    or any("vbaproject" in e.filename.casefold() for e in entries)
                ):
                    raise PriceListError(
                        PriceListErrorCode.INVALID_FILE_TYPE,
                        "فقط محتوای واقعی XLSX بدون ماکرو پذیرفته می‌شود.",
                    )
        except (KeyError, BadZipFile) as exc:
            raise PriceListError(
                PriceListErrorCode.WORKBOOK_UNREADABLE, "ساختار فایل Excel معتبر نیست."
            ) from exc

    def _archive_limit_error(self, filename: str) -> PriceListError:
        return PriceListError(
            PriceListErrorCode.XLSX_ARCHIVE_LIMIT_EXCEEDED,
            "ساختار فشرده فایل Excel از محدودیت ایمن پردازش عبور کرده است.",
            {"filename": filename},
        )

    def _validate_workbook_dimensions(self, workbook: Workbook) -> None:
        worksheets = self._read_only_worksheets(workbook)
        if len(worksheets) > self._limits.max_sheets:
            raise PriceListError(
                PriceListErrorCode.WORKBOOK_SHEET_LIMIT_EXCEEDED,
                "تعداد برگه‌های فایل Excel از محدودیت مجاز بیشتر است.",
                {"max_sheets": self._limits.max_sheets},
            )

        max_sheet_rows = self._limits.max_rows + self._limits.max_header_scan_rows
        for sheet in worksheets:
            if (sheet.max_row or 0) > max_sheet_rows:
                raise PriceListError(
                    PriceListErrorCode.WORKBOOK_ROW_LIMIT_EXCEEDED,
                    "تعداد ردیف‌های فایل Excel از محدودیت مجاز بیشتر است.",
                    {"sheet": sheet.title, "max_rows": self._limits.max_rows},
                )
            if (sheet.max_column or 0) > self._limits.max_columns:
                raise PriceListError(
                    PriceListErrorCode.WORKBOOK_COLUMN_LIMIT_EXCEEDED,
                    "تعداد ستون‌های فایل Excel از محدودیت مجاز بیشتر است.",
                    {"sheet": sheet.title, "max_columns": self._limits.max_columns},
                )

    def _analyze_workbook(
        self,
        workbook: Workbook,
        *,
        mapping: ColumnMapping | None,
        header_signature: tuple[str, ...] | None,
        sheet_name: str | None,
        header_row: int | None,
        deadline: float,
    ) -> ExtractionReport:
        sheets = self._read_only_worksheets(workbook)
        candidates: list[tuple[int, _ReadOnlySheet, int, tuple[object, ...]]] = []
        for sheet in sheets:
            for number, row in enumerate(
                sheet.iter_rows(
                    min_row=1,
                    max_row=min(
                        sheet.max_row or self._limits.max_header_scan_rows,
                        self._limits.max_header_scan_rows,
                    ),
                    values_only=True,
                ),
                1,
            ):
                self._check_resources(row, deadline)
                columns, ambiguous = detect_columns(row)
                candidates.append((len(columns) + len(ambiguous), sheet, number, row))
        candidates.sort(key=lambda candidate: -candidate[0])
        if not candidates:
            raise PriceListError(PriceListErrorCode.HEADER_NOT_FOUND, "سطر عنوان جدول پیدا نشد.")
        _, selected, number, headers = candidates[0]
        explicit = mapping is not None or header_row is not None or sheet_name is not None
        if mapping:
            sheet_name, header_row = mapping.sheet_name, mapping.header_row
        layout_missing = False
        if explicit:
            selected_sheet = next(
                (sheet for sheet in sheets if sheet.title == (sheet_name or selected.title)), None
            )
            if selected_sheet is None or not 1 <= (header_row or number) <= (
                selected_sheet.max_row or self._limits.max_rows
            ):
                if header_signature is None:
                    raise PriceListError(
                        PriceListErrorCode.INVALID_COLUMN_MAPPING,
                        "برگه یا ردیف عنوان در فایل وجود ندارد.",
                    )
                layout_missing = True
            else:
                selected, number = selected_sheet, header_row or number
                headers = next(
                    iter(selected.iter_rows(min_row=number, max_row=number, values_only=True)), ()
                )
        proposed, ambiguous = detect_columns(headers)
        detected = ColumnMapping(selected.title, number, proposed)
        used = mapping or detected
        self._check_resources(headers, deadline)
        preview_rows = list(
            selected.iter_rows(
                min_row=number + 1,
                max_row=min(number + 5, selected.max_row or number + 5),
                values_only=True,
            )
        )
        for row in preview_rows:
            self._check_resources(row, deadline)
        width = max([len(headers), *(len(row) for row in preview_rows)])
        headers = (*headers, *((None,) * (width - len(headers))))
        snapshot: dict[str, object] = {
            "sheets": [sheet.title for sheet in sheets],
            "detected_mapping": detected.as_dict(),
            "used_mapping": None,
            "origin": "manual" if mapping else "detected",
            "template_id": None,
            "columns": [
                {"index": index, "label": str(value or "")[:200]}
                for index, value in enumerate(headers, 1)
            ],
            "header_signature": [normalize_header(value) for value in headers],
            "ambiguous_fields": {
                field.value: list(positions) for field, positions in ambiguous.items()
            },
            "preview": [
                {
                    "source_row_number": row_number,
                    "values": [str(value)[:200] if value is not None else "" for value in row],
                }
                for row_number, row in enumerate(
                    preview_rows,
                    number + 1,
                )
                if row_number <= (selected.max_row or number + 5)
            ],
            "issues": [],
            "total_errors": 0,
            "errors_truncated": False,
        }
        try:
            for n, row in enumerate(
                selected.iter_rows(min_row=1, max_row=number, values_only=True), 1
            ):
                self._check_resources(row, deadline)
                if any("تومان" in normalize_persian_text(value) for value in row):
                    raise PriceListError(
                        PriceListErrorCode.TOMAN_NOT_SUPPORTED,
                        "این فایل برچسب تومان دارد؛ مبلغ باید ریال باشد.",
                        {"row": n, "field": "price_irr"},
                    )
            if header_signature is not None and (
                layout_missing or tuple(normalize_header(v) for v in headers) != header_signature
            ):
                raise PriceListError(
                    PriceListErrorCode.TEMPLATE_LAYOUT_MISMATCH,
                    "قالب فایل با الگوی ذخیره‌شده یکسان نیست؛ نگاشت را بازبینی و اصلاح کنید.",
                )
            if (
                not explicit
                and candidates[0][0] > 0
                and sum(c[0] == candidates[0][0] for c in candidates) > 1
            ):
                raise PriceListError(
                    PriceListErrorCode.AMBIGUOUS_HEADER,
                    "چند ردیف یا برگه کاندید عنوان هستند؛ برگه و ردیف عنوان را انتخاب کنید.",
                )
            if mapping is None and ambiguous:
                raise PriceListError(
                    PriceListErrorCode.AMBIGUOUS_COLUMN_MAPPING,
                    "برای یک فیلد چند ستون پیدا شد؛ ستون درست را انتخاب کنید.",
                )
            used.validate(column_count=len(headers))
            snapshot["used_mapping"] = used.as_dict()
            items = self._extract_rows(
                sheet=selected,
                header_row_number=number,
                columns={field.value: index - 1 for field, index in used.columns.items()},
                header_values=headers,
                deadline=deadline,
            )
            return ExtractionReport(items, snapshot, None)
        except PriceListError as error:
            if error.code.value.startswith("WORKBOOK_"):
                raise
            snapshot["issues"] = error.details.get(
                "issues",
                [
                    {
                        "code": error.code.value,
                        "message": error.message,
                        "row": error.details.get("row"),
                        "field": error.details.get("field"),
                    }
                ],
            )
            snapshot["total_errors"] = error.details.get("total_errors", 1)
            snapshot["errors_truncated"] = error.details.get("errors_truncated", False)
            return ExtractionReport([], snapshot, error)

    def _extract_rows(
        self,
        *,
        sheet: _ReadOnlySheet,
        header_row_number: int,
        columns: dict[str, int],
        header_values: tuple[object, ...],
        deadline: float,
    ) -> list[PriceListItem]:
        items: list[PriceListItem] = []
        seen_codes: set[str] = set()
        issues: list[dict[str, object]] = []
        total_errors = 0

        if sheet.max_row is not None and sheet.max_row - header_row_number > self._limits.max_rows:
            raise PriceListError(
                PriceListErrorCode.WORKBOOK_ROW_LIMIT_EXCEEDED,
                "تعداد ردیف‌های فایل Excel از محدودیت مجاز بیشتر است.",
                {"sheet": sheet.title, "max_rows": self._limits.max_rows},
            )

        rows: Iterable[tuple[object, ...]] = sheet.iter_rows(
            min_row=header_row_number + 1,
            values_only=True,
        )
        for source_row_number, row in enumerate(rows, start=header_row_number + 1):
            self._check_resources(row, deadline)
            if source_row_number - header_row_number > self._limits.max_rows:
                raise PriceListError(
                    PriceListErrorCode.WORKBOOK_ROW_LIMIT_EXCEEDED,
                    "تعداد ردیف‌های فایل Excel از محدودیت مجاز بیشتر است.",
                    {"sheet": sheet.title, "max_rows": self._limits.max_rows},
                )
            if self._row_is_empty(row):
                continue

            raw_code = self._cell(row, columns["product_code"])
            raw_name = self._cell(row, columns["product_name"])
            raw_price = self._cell(row, columns["price_irr"])

            try:
                code_raw_text = self._required_text(
                    raw_code,
                    code=PriceListErrorCode.EMPTY_PRODUCT_CODE,
                )
                product_code = normalize_product_code(raw_code)
                name_raw_text = self._required_text(
                    raw_name,
                    code=PriceListErrorCode.EMPTY_PRODUCT_NAME,
                )
                product_name = normalize_product_name(raw_name)
                price_irr = parse_price_irr(raw_price)
                pack_size = parse_pack_size(self._optional_cell(row, columns, "pack_size"))
            except PriceListError as exc:
                total_errors += 1
                if len(issues) < 100:
                    issues.append(self._row_issue(exc, source_row_number))
                continue

            if product_code in seen_codes:
                total_errors += 1
                if len(issues) < 100:
                    issues.append(
                        self._row_issue(
                            PriceListError(
                                PriceListErrorCode.DUPLICATE_PRODUCT_CODE,
                                "کد کالا در فایل تکرار شده است.",
                            ),
                            source_row_number,
                        )
                    )
                continue
            seen_codes.add(product_code)

            availability_value = self._optional_cell(row, columns, "availability")
            item = PriceListItem(
                source_row_number=source_row_number,
                product_code_raw=code_raw_text,
                product_code_normalized=product_code,
                product_name_raw=name_raw_text,
                product_name_normalized=product_name,
                brand=self._optional_text(self._optional_cell(row, columns, "brand")),
                unit=self._optional_text(self._optional_cell(row, columns, "unit")),
                pack_size=pack_size,
                price_irr=price_irr,
                availability=map_availability(availability_value),
                availability_raw=self._optional_text(availability_value),
                notes=self._optional_text(self._optional_cell(row, columns, "notes")),
                raw_row=self._raw_row(header_values, row),
            )
            items.append(item)

        if issues:
            first = issues[0]
            raise PriceListError(
                PriceListErrorCode(str(first["code"])),
                str(first["message"]),
                {
                    "sheet": sheet.title,
                    "row": first["row"],
                    "field": first["field"],
                    "issues": issues,
                    "total_errors": total_errors,
                    "errors_truncated": total_errors > len(issues),
                },
            )
        if not items:
            raise PriceListError(
                PriceListErrorCode.NO_PRODUCT_ROWS,
                "هیچ ردیف کالای معتبری در فایل پیدا نشد.",
            )
        return items

    def _check_resources(self, row: Sequence[object], deadline: float) -> None:
        if monotonic() > deadline:
            raise PriceListError(
                PriceListErrorCode.WORKBOOK_PROCESSING_TIMEOUT,
                "زمان پردازش فایل از حد مجاز گذشت؛ فایل کوچک‌تری انتخاب کنید.",
            )
        if len(row) > self._limits.max_columns:
            raise PriceListError(
                PriceListErrorCode.WORKBOOK_COLUMN_LIMIT_EXCEEDED,
                "تعداد ستون‌های فایل از محدودیت مجاز بیشتر است.",
            )

    @staticmethod
    def _row_issue(error: PriceListError, row: int) -> dict[str, object]:
        fields = {
            PriceListErrorCode.EMPTY_PRODUCT_CODE: "product_code",
            PriceListErrorCode.INVALID_PRODUCT_CODE: "product_code",
            PriceListErrorCode.DUPLICATE_PRODUCT_CODE: "product_code",
            PriceListErrorCode.EMPTY_PRODUCT_NAME: "product_name",
            PriceListErrorCode.INVALID_PRICE: "price_irr",
            PriceListErrorCode.TOMAN_NOT_SUPPORTED: "price_irr",
            PriceListErrorCode.INVALID_PACK_SIZE: "pack_size",
        }
        return {
            "row": row,
            "field": fields.get(error.code),
            "code": error.code.value,
            "message": error.message,
        }

    @staticmethod
    def _cell(row: Sequence[object], index: int) -> object:
        return row[index] if index < len(row) else None

    def _optional_cell(
        self,
        row: Sequence[object],
        columns: dict[str, int],
        name: str,
    ) -> object:
        index = columns.get(name)
        return None if index is None else self._cell(row, index)

    @staticmethod
    def _required_text(value: object, *, code: PriceListErrorCode) -> str:
        text = normalize_persian_text(value)
        if not text:
            message = (
                "کد کالا خالی است."
                if code is PriceListErrorCode.EMPTY_PRODUCT_CODE
                else "شرح کالا خالی است."
            )
            raise PriceListError(code, message)
        return text

    @staticmethod
    def _optional_text(value: object) -> str | None:
        text = normalize_persian_text(value)
        return text or None

    @staticmethod
    def _row_is_empty(row: Sequence[object]) -> bool:
        return not any(value is not None and str(value).strip() for value in row)

    @staticmethod
    def _raw_row(headers: tuple[object, ...], row: Sequence[object]) -> dict[str, object]:
        raw: dict[str, object] = {f"column_{index + 1}": value for index, value in enumerate(row)}
        for index, value in enumerate(row):
            header = normalize_persian_text(headers[index]) if index < len(headers) else ""
            if header and header not in raw:
                raw[header] = value
        return raw

    @staticmethod
    def _read_only_worksheets(workbook: Workbook) -> tuple[_ReadOnlySheet, ...]:
        worksheets = tuple(workbook.worksheets)
        if not workbook.read_only or not all(
            isinstance(sheet, _ReadOnlySheet) for sheet in worksheets
        ):
            raise RuntimeError("Workbook was not opened in read-only mode")
        return tuple(sheet for sheet in worksheets if isinstance(sheet, _ReadOnlySheet))
