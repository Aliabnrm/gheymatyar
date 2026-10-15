import type {
  AuditPagination,
  ChangeReportFilters,
  CurrentPriceImpactFilters,
  VersionItemPagination,
  VersionListPagination,
} from "./price-list-versions.schema";
export const priceListVersionKeys = {
  all: ["price-list-versions"] as const,
  bySupplier: (supplierId: string) =>
    [...priceListVersionKeys.all, "supplier", supplierId] as const,
  lists: (supplierId: string) => [...priceListVersionKeys.bySupplier(supplierId), "list"] as const,
  list: (supplierId: string, pagination: VersionListPagination) =>
    [...priceListVersionKeys.lists(supplierId), pagination] as const,
  details: (supplierId: string) =>
    [...priceListVersionKeys.bySupplier(supplierId), "detail"] as const,
  detail: (supplierId: string, versionId: string) =>
    [...priceListVersionKeys.details(supplierId), versionId] as const,
  items: (supplierId: string, versionId: string, pagination: VersionItemPagination) =>
    [...priceListVersionKeys.detail(supplierId, versionId), "items", pagination] as const,
  importComparison: (supplierId: string, importId: string, filters: ChangeReportFilters) =>
    [
      ...priceListVersionKeys.bySupplier(supplierId),
      "import-comparison",
      importId,
      filters,
    ] as const,
  changes: (supplierId: string, versionId: string, filters: ChangeReportFilters) =>
    [...priceListVersionKeys.detail(supplierId, versionId), "changes", filters] as const,
  currentImpact: (supplierId: string, versionId: string, filters: CurrentPriceImpactFilters) =>
    [...priceListVersionKeys.detail(supplierId, versionId), "current-impact", filters] as const,
  current: (supplierId: string) =>
    [...priceListVersionKeys.bySupplier(supplierId), "current"] as const,
  auditEvents: (supplierId: string, versionId: string, pagination: AuditPagination) =>
    [...priceListVersionKeys.detail(supplierId, versionId), "audit-events", pagination] as const,
};
