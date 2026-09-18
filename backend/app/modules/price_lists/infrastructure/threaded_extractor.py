from functools import partial

from anyio import to_thread

from ..application.import_ports import AsyncPriceListExtractor
from ..application.ports import PriceListExtractor
from ..domain.models import PriceListItem


class ThreadedPriceListExtractor(AsyncPriceListExtractor):
    def __init__(self, extractor: PriceListExtractor) -> None:
        self._extractor = extractor

    async def extract(self, content: bytes, *, filename: str) -> list[PriceListItem]:
        return await to_thread.run_sync(
            partial(self._extractor.extract, content, filename=filename)
        )
