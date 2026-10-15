"use client";
import { useQuery } from "@tanstack/react-query";
import { ApiRequestError } from "@/core/api/api-error";
import {
  getCurrentPriceImpactApi,
  getCurrentPriceListVersionApi,
  getImportChangeReportApi,
  getPriceListVersionApi,
  getPriceListVersionChangesApi,
  listPriceListVersionAuditEventsApi,
  listPriceListVersionItemsApi,
  listPriceListVersionsApi,
} from "./price-list-versions.api";
import type {
  AuditPagination,
  ChangeReportFilters,
  CurrentPriceImpact,
  CurrentPriceImpactFilters,
  CurrentPriceListVersionResponse,
  ImportChangeReport,
  PriceListAuditEventList,
  PriceListVersion,
  PriceListVersionItemList,
  PriceListVersionList,
  VersionChangeReport,
  VersionItemPagination,
  VersionListPagination,
} from "./price-list-versions.schema";
import { priceListVersionKeys } from "./price-list-version.keys";
function retryRead(failureCount: number, error: ApiRequestError): boolean {
  return error.status >= 500 && failureCount < 1;
}

export function usePriceListVersionsQuery(supplierId: string, pagination: VersionListPagination) {
  return useQuery<PriceListVersionList, ApiRequestError>({
    queryKey: priceListVersionKeys.list(supplierId, pagination),
    queryFn: ({ signal }) => listPriceListVersionsApi(supplierId, pagination, signal),
    retry: retryRead,
  });
}

export function usePriceListVersionQuery(supplierId: string, versionId: string) {
  return useQuery<PriceListVersion, ApiRequestError>({
    queryKey: priceListVersionKeys.detail(supplierId, versionId),
    queryFn: ({ signal }) => getPriceListVersionApi(supplierId, versionId, signal),
    retry: retryRead,
  });
}

export function usePriceListVersionItemsQuery(
  supplierId: string,
  versionId: string,
  pagination: VersionItemPagination,
) {
  return useQuery<PriceListVersionItemList, ApiRequestError>({
    queryKey: priceListVersionKeys.items(supplierId, versionId, pagination),
    queryFn: ({ signal }) =>
      listPriceListVersionItemsApi(supplierId, versionId, pagination, signal),
    retry: retryRead,
  });
}

export function useImportChangeReportQuery(
  supplierId: string,
  importId: string,
  filters: ChangeReportFilters,
  enabled = true,
) {
  return useQuery<ImportChangeReport, ApiRequestError>({
    queryKey: priceListVersionKeys.importComparison(supplierId, importId, filters),
    queryFn: ({ signal }) => getImportChangeReportApi(supplierId, importId, filters, signal),
    retry: retryRead,
    enabled,
  });
}

export function usePriceListVersionChangesQuery(
  supplierId: string,
  versionId: string,
  filters: ChangeReportFilters,
) {
  return useQuery<VersionChangeReport, ApiRequestError>({
    queryKey: priceListVersionKeys.changes(supplierId, versionId, filters),
    queryFn: ({ signal }) => getPriceListVersionChangesApi(supplierId, versionId, filters, signal),
    retry: retryRead,
  });
}

export function useCurrentPriceImpactQuery(
  supplierId: string,
  versionId: string,
  filters: CurrentPriceImpactFilters,
  enabled = true,
) {
  return useQuery<CurrentPriceImpact, ApiRequestError>({
    queryKey: priceListVersionKeys.currentImpact(supplierId, versionId, filters),
    queryFn: ({ signal }) => getCurrentPriceImpactApi(supplierId, versionId, filters, signal),
    retry: retryRead,
    enabled,
  });
}

export function useCurrentPriceListVersionQuery(supplierId: string) {
  return useQuery<CurrentPriceListVersionResponse, ApiRequestError>({
    queryKey: priceListVersionKeys.current(supplierId),
    queryFn: ({ signal }) => getCurrentPriceListVersionApi(supplierId, signal),
    retry: retryRead,
  });
}

export function usePriceListVersionAuditEventsQuery(
  supplierId: string,
  versionId: string,
  pagination: AuditPagination,
) {
  return useQuery<PriceListAuditEventList, ApiRequestError>({
    queryKey: priceListVersionKeys.auditEvents(supplierId, versionId, pagination),
    queryFn: ({ signal }) =>
      listPriceListVersionAuditEventsApi(supplierId, versionId, pagination, signal),
    retry: retryRead,
  });
}
