from dataclasses import dataclass

from .approval_queries import GetCurrentPriceListVersion, ListPriceListVersionAuditEvents
from .approve_price_list_version import ApprovePriceListVersion
from .create_price_list_version import CreatePriceListVersion
from .current_price_impact import GetCurrentPriceImpact
from .reject_price_list_version import RejectPriceListVersion
from .version_queries import (
    GetImportChangeReport,
    GetPriceListVersion,
    GetVersionChangeReport,
    ListPriceListVersionItems,
    ListPriceListVersions,
)


@dataclass(frozen=True, slots=True)
class PriceListVersionServices:
    create: CreatePriceListVersion
    list: ListPriceListVersions
    get: GetPriceListVersion
    list_items: ListPriceListVersionItems
    import_changes: GetImportChangeReport
    version_changes: GetVersionChangeReport
    approve: ApprovePriceListVersion
    reject: RejectPriceListVersion
    current: GetCurrentPriceListVersion
    audit_events: ListPriceListVersionAuditEvents
    current_impact: GetCurrentPriceImpact
