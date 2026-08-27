from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from openpyxl import Workbook

from app.modules.price_lists.domain.errors import PriceListError, PriceListErrorCode
from app.modules.price_lists.infrastructure.xlsx_extractor import (
    XlsxExtractionLimits,
    XlsxPriceListExtractor,
)


def workbook_bytes(*, product_rows: int = 1, sheet_count: int = 1) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["کد کالا", "شرح کالا", "قیمت ریال"])
    for index in range(product_rows):
        sheet.append([f"P-{index}", f"کالای {index}", 100 + index])
    for index in range(1, sheet_count):
        workbook.create_sheet(f"sheet-{index}")

    output = BytesIO()
    workbook.save(output)
    workbook.close()
    return output.getvalue()


def test_rejects_workbook_above_row_limit() -> None:
    extractor = XlsxPriceListExtractor(XlsxExtractionLimits(max_rows=2))

    with pytest.raises(PriceListError) as raised:
        extractor.extract(workbook_bytes(product_rows=3), filename="rows.xlsx")

    assert raised.value.code is PriceListErrorCode.WORKBOOK_ROW_LIMIT_EXCEEDED


def test_rejects_workbook_above_sheet_limit() -> None:
    extractor = XlsxPriceListExtractor(XlsxExtractionLimits(max_sheets=1))

    with pytest.raises(PriceListError) as raised:
        extractor.extract(workbook_bytes(sheet_count=2), filename="sheets.xlsx")

    assert raised.value.code is PriceListErrorCode.WORKBOOK_SHEET_LIMIT_EXCEEDED


def test_rejects_workbook_above_column_limit() -> None:
    content = workbook_bytes()
    extractor = XlsxPriceListExtractor(XlsxExtractionLimits(max_columns=2))

    with pytest.raises(PriceListError) as raised:
        extractor.extract(content, filename="columns.xlsx")

    assert raised.value.code is PriceListErrorCode.WORKBOOK_COLUMN_LIMIT_EXCEEDED


def test_rejects_suspiciously_large_xlsx_archive() -> None:
    output = BytesIO()
    with ZipFile(output, mode="w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("xl/worksheets/sheet1.xml", b"0" * 20_000)

    extractor = XlsxPriceListExtractor(
        XlsxExtractionLimits(max_uncompressed_bytes=1_000),
    )
    with pytest.raises(PriceListError) as raised:
        extractor.extract(output.getvalue(), filename="archive.xlsx")

    assert raised.value.code is PriceListErrorCode.XLSX_ARCHIVE_LIMIT_EXCEEDED
