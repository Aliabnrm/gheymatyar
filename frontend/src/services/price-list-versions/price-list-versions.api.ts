import { apiRequest } from "@/core/api/api-client";

import {
  ApprovalInputSchema,
  ApprovalResultSchema,
  AuditPaginationSchema,
  ChangeReportFiltersSchema,
  CreatePriceListVersionInputSchema,
  CurrentPriceListVersionResponseSchema,
  ImportChangeReportSchema,
  PriceListAuditEventListSchema,
  PriceListVersionItemListSchema,
  PriceListVersionListSchema,
  PriceListVersionSchema,
  RejectionInputSchema,
  VersionChangeReportSchema,
  VersionItemPaginationSchema,
  VersionListPaginationSchema,
  type ApprovalInput,
  type ApprovalResult,
  type AuditPagination,
  type ChangeReportFilters,
  type CreatePriceListVersionInput,
  type CurrentPriceListVersionResponse,
  type ImportChangeReport,
  type PriceListVersion,
  type PriceListAuditEventList,
  type PriceListVersionItemList,
  type PriceListVersionList,
  type RejectionInput,
  type VersionChangeReport,
  type VersionItemPagination,
  type VersionListPagination,
} from "./price-list-versions.schema";

function supplierPath(supplierId: string): `/${string}` {
  return `/api/v1/suppliers/${encodeURIComponent(supplierId)}`;
}

function changeQuery(filters: ChangeReportFilters): string {
  const parsed = ChangeReportFiltersSchema.parse(filters);
  const query = new URLSearchParams({
    limit: String(parsed.limit),
    offset: String(parsed.offset),
  });
  if (parsed.changeType) query.set("change_type", parsed.changeType);
  return query.toString();
}

export function getImportChangeReportApi(
  supplierId: string,
  importId: string,
  filters: ChangeReportFilters,
  signal?: AbortSignal,
): Promise<ImportChangeReport> {
  return apiRequest({
    path: `${supplierPath(supplierId)}/imports/${encodeURIComponent(importId)}/comparison?${changeQuery(filters)}`,
    signal,
    responseSchema: ImportChangeReportSchema,
  });
}

export function createPriceListVersionApi(
  supplierId: string,
  importId: string,
  input: CreatePriceListVersionInput,
): Promise<PriceListVersion> {
  const parsed = CreatePriceListVersionInputSchema.parse(input);
  return apiRequest({
    path: `${supplierPath(supplierId)}/imports/${encodeURIComponent(importId)}/version`,
    method: "POST",
    includeCsrfToken: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expected_previous_version_id: parsed.expectedPreviousVersionId,
      confirm_create: parsed.confirmCreate,
    }),
    responseSchema: PriceListVersionSchema,
  });
}

export function listPriceListVersionsApi(
  supplierId: string,
  pagination: VersionListPagination,
  signal?: AbortSignal,
): Promise<PriceListVersionList> {
  const parsed = VersionListPaginationSchema.parse(pagination);
  const query = new URLSearchParams({
    limit: String(parsed.limit),
    offset: String(parsed.offset),
  });
  return apiRequest({
    path: `${supplierPath(supplierId)}/price-list-versions?${query}`,
    signal,
    responseSchema: PriceListVersionListSchema,
  });
}

export function getPriceListVersionApi(
  supplierId: string,
  versionId: string,
  signal?: AbortSignal,
): Promise<PriceListVersion> {
  return apiRequest({
    path: `${supplierPath(supplierId)}/price-list-versions/${encodeURIComponent(versionId)}`,
    signal,
    responseSchema: PriceListVersionSchema,
  });
}

export function listPriceListVersionItemsApi(
  supplierId: string,
  versionId: string,
  pagination: VersionItemPagination,
  signal?: AbortSignal,
): Promise<PriceListVersionItemList> {
  const parsed = VersionItemPaginationSchema.parse(pagination);
  const query = new URLSearchParams({
    limit: String(parsed.limit),
    offset: String(parsed.offset),
  });
  return apiRequest({
    path: `${supplierPath(supplierId)}/price-list-versions/${encodeURIComponent(versionId)}/items?${query}`,
    signal,
    responseSchema: PriceListVersionItemListSchema,
  });
}

export function getPriceListVersionChangesApi(
  supplierId: string,
  versionId: string,
  filters: ChangeReportFilters,
  signal?: AbortSignal,
): Promise<VersionChangeReport> {
  return apiRequest({
    path: `${supplierPath(supplierId)}/price-list-versions/${encodeURIComponent(versionId)}/changes?${changeQuery(filters)}`,
    signal,
    responseSchema: VersionChangeReportSchema,
  });
}

export function approvePriceListVersionApi(
  supplierId: string,
  versionId: string,
  input: ApprovalInput,
): Promise<ApprovalResult> {
  const parsed = ApprovalInputSchema.parse(input);
  return apiRequest({
    path: `${supplierPath(supplierId)}/price-list-versions/${encodeURIComponent(versionId)}/approve`,
    method: "POST",
    includeCsrfToken: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expected_current_version_id: parsed.expectedCurrentVersionId,
      confirm_approval: parsed.confirmApproval,
      decision_note: parsed.decisionNote,
    }),
    responseSchema: ApprovalResultSchema,
  });
}

export function rejectPriceListVersionApi(
  supplierId: string,
  versionId: string,
  input: RejectionInput,
): Promise<ApprovalResult> {
  const parsed = RejectionInputSchema.parse(input);
  return apiRequest({
    path: `${supplierPath(supplierId)}/price-list-versions/${encodeURIComponent(versionId)}/reject`,
    method: "POST",
    includeCsrfToken: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      confirm_rejection: parsed.confirmRejection,
      reason: parsed.reason,
    }),
    responseSchema: ApprovalResultSchema,
  });
}

export function getCurrentPriceListVersionApi(
  supplierId: string,
  signal?: AbortSignal,
): Promise<CurrentPriceListVersionResponse> {
  return apiRequest({
    path: `${supplierPath(supplierId)}/price-list-versions/current`,
    signal,
    responseSchema: CurrentPriceListVersionResponseSchema,
  });
}

export function listPriceListVersionAuditEventsApi(
  supplierId: string,
  versionId: string,
  pagination: AuditPagination,
  signal?: AbortSignal,
): Promise<PriceListAuditEventList> {
  const parsed = AuditPaginationSchema.parse(pagination);
  const query = new URLSearchParams({
    limit: String(parsed.limit),
    offset: String(parsed.offset),
  });
  return apiRequest({
    path: `${supplierPath(supplierId)}/price-list-versions/${encodeURIComponent(versionId)}/audit-events?${query.toString()}`,
    signal,
    responseSchema: PriceListAuditEventListSchema,
  });
}
