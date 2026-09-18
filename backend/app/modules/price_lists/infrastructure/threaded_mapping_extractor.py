from functools import partial

from anyio import to_thread

from ..application.mapping_dto import ExtractionReport
from ..domain.mapping import ColumnMapping
from .xlsx_extractor import XlsxPriceListExtractor


class ThreadedMappingExtractor:
    def __init__(self, extractor: XlsxPriceListExtractor) -> None:
        self._extractor = extractor

    async def analyze(
        self,
        content: bytes,
        *,
        filename: str,
        mapping: ColumnMapping | None = None,
        header_signature: tuple[str, ...] | None = None,
        sheet_name: str | None = None,
        header_row: int | None = None,
    ) -> ExtractionReport:
        return await to_thread.run_sync(
            partial(
                self._extractor.analyze,
                content,
                filename=filename,
                mapping=mapping,
                header_signature=header_signature,
                sheet_name=sheet_name,
                header_row=header_row,
            )
        )
