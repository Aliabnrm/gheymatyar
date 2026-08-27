from dataclasses import dataclass

from ..domain.comparison import compare_price_lists
from ..domain.models import ComparisonResult
from .ports import PriceListExtractor


@dataclass(slots=True)
class ComparePriceLists:
    extractor: PriceListExtractor

    def execute(
        self,
        *,
        old_content: bytes,
        old_filename: str,
        new_content: bytes,
        new_filename: str,
    ) -> ComparisonResult:
        old_items = self.extractor.extract(old_content, filename=old_filename)
        new_items = self.extractor.extract(new_content, filename=new_filename)
        return compare_price_lists(old_items, new_items)
