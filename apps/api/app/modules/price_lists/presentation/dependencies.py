from typing import Annotated

from fastapi import Depends

from app.api.dependencies import get_request_settings
from app.core.config import Settings

from ..application.compare_price_lists import ComparePriceLists
from ..infrastructure.xlsx_extractor import XlsxExtractionLimits, XlsxPriceListExtractor


def get_compare_price_lists(
    settings: Annotated[Settings, Depends(get_request_settings)],
) -> ComparePriceLists:
    limits = XlsxExtractionLimits(
        max_header_scan_rows=settings.max_workbook_header_scan_rows,
        max_rows=settings.max_workbook_rows,
        max_columns=settings.max_workbook_columns,
        max_sheets=settings.max_workbook_sheets,
        max_archive_entries=settings.max_xlsx_archive_entries,
        max_uncompressed_bytes=settings.max_xlsx_uncompressed_bytes,
        max_compression_ratio=settings.max_xlsx_compression_ratio,
    )
    return ComparePriceLists(extractor=XlsxPriceListExtractor(limits))
