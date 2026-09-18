from typing import Protocol
from uuid import UUID

from ..domain.import_models import PriceListImport
from ..domain.mapping import ColumnMapping
from .import_dto import NewExtractedRow, NewImportRun
from .mapping_dto import ExtractionReport, MappingTemplate


class MappingExtractor(Protocol):
    async def analyze(
        self,
        content: bytes,
        *,
        filename: str,
        mapping: ColumnMapping | None = None,
        header_signature: tuple[str, ...] | None = None,
        sheet_name: str | None = None,
        header_row: int | None = None,
    ) -> ExtractionReport: ...


class MappingStore(Protocol):
    async def get_template(
        self, *, organization_id: UUID, supplier_id: UUID
    ) -> MappingTemplate | None: ...

    async def save_template(
        self, *, template: MappingTemplate, expected_template_id: UUID | None
    ) -> MappingTemplate: ...

    async def create_rerun(
        self, *, run: NewImportRun, rows: tuple[NewExtractedRow, ...]
    ) -> PriceListImport: ...
