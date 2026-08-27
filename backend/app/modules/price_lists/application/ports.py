from typing import Protocol

from ..domain.models import PriceListItem


class PriceListExtractor(Protocol):
    def extract(self, content: bytes, *, filename: str) -> list[PriceListItem]: ...
