from dataclasses import dataclass

from .create_import import CreatePriceListImport
from .get_import import GetPriceListImport
from .list_extracted_rows import ListExtractedRows
from .list_imports import ListPriceListImports


@dataclass(frozen=True, slots=True)
class PriceListImportServices:
    create: CreatePriceListImport
    list: ListPriceListImports
    get: GetPriceListImport
    list_rows: ListExtractedRows
