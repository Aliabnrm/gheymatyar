"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ApiRequestError } from "@/core/api/api-error";
import { priceListImportKeys } from "@/services/price-list-imports";
import { supplierKeys } from "@/services/suppliers";

import {
  approvePriceListVersionApi,
  createPriceListVersionApi,
  getCurrentPriceImpactApi,
  getCurrentPriceListVersionApi,
  getImportChangeReportApi,
  getPriceListVersionApi,
  getPriceListVersionChangesApi,
  listPriceListVersionAuditEventsApi,
  listPriceListVersionItemsApi,
  listPriceListVersionsApi,
  rejectPriceListVersionApi,
} from "./price-list-versions.api";
import type {
  ApprovalInput,
  ApprovalResult,
  AuditPagination,
  ChangeReportFilters,
  CreatePriceListVersionInput,
  CurrentPriceImpact,
  CurrentPriceImpactFilters,
  CurrentPriceListVersionResponse,
  ImportChangeReport,
  PriceListAuditEventList,
  PriceListVersion,
  PriceListVersionItemList,
  PriceListVersionList,
  RejectionInput,
  VersionChangeReport,
  VersionItemPagination,
  VersionListPagination,
} from "./price-list-versions.schema";

export const priceListVersionKeys = {
  all: ["price-list-versions"] as const,
  bySupplier: (supplierId: string) =>
    [...priceListVersionKeys.all, "supplier", supplierId] as const,
  lists: (supplierId: string) =>
    [...priceListVersionKeys.bySupplier(supplierId), "list"] as const,
  list: (supplierId: string, pagination: VersionListPagination) =>
    [...priceListVersionKeys.lists(supplierId), pagination] as const,
  details: (supplierId: string) =>
    [...priceListVersionKeys.bySupplier(supplierId), "detail"] as const,
  detail: (supplierId: string, versionId: string) =>
    [...priceListVersionKeys.details(supplierId), versionId] as const,
  items: (
    supplierId: string,
    versionId: string,
    pagination: VersionItemPagination,
  ) =>
    [
      ...priceListVersionKeys.detail(supplierId, versionId),
      "items",
      pagination,
    ] as const,
  importComparison: (
    supplierId: string,
    importId: string,
    filters: ChangeReportFilters,
  ) =>
    [
      ...priceListVersionKeys.bySupplier(supplierId),
      "import-comparison",
      importId,
      filters,
    ] as const,
  changes: (
    supplierId: string,
    versionId: string,
    filters: ChangeReportFilters,
  ) =>
    [
      ...priceListVersionKeys.detail(supplierId, versionId),
      "changes",
      filters,
    ] as const,
  currentImpact: (
    supplierId: string,
    versionId: string,
    filters: CurrentPriceImpactFilters,
  ) =>
    [
      ...priceListVersionKeys.detail(supplierId, versionId),
      "current-impact",
      filters,
    ] as const,
  current: (supplierId: string) =>
    [...priceListVersionKeys.bySupplier(supplierId), "current"] as const,
  auditEvents: (
    supplierId: string,
    versionId: string,
    pagination: AuditPagination,
  ) =>
    [
      ...priceListVersionKeys.detail(supplierId, versionId),
      "audit-events",
      pagination,
    ] as const,
};

function retryRead(failureCount: number, error: ApiRequestError): boolean {
  return error.status >= 500 && failureCount < 1;
}

export function usePriceListVersionsQuery(
  supplierId: string,
  pagination: VersionListPagination,
) {
  return useQuery<PriceListVersionList, ApiRequestError>({
    queryKey: priceListVersionKeys.list(supplierId, pagination),
    queryFn: ({ signal }) =>
      listPriceListVersionsApi(supplierId, pagination, signal),
    retry: retryRead,
  });
}

export function usePriceListVersionQuery(
  supplierId: string,
  versionId: string,
) {
  return useQuery<PriceListVersion, ApiRequestError>({
    queryKey: priceListVersionKeys.detail(supplierId, versionId),
    queryFn: ({ signal }) =>
      getPriceListVersionApi(supplierId, versionId, signal),
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
    queryKey: priceListVersionKeys.importComparison(
      supplierId,
      importId,
      filters,
    ),
    queryFn: ({ signal }) =>
      getImportChangeReportApi(supplierId, importId, filters, signal),
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
    queryFn: ({ signal }) =>
      getPriceListVersionChangesApi(supplierId, versionId, filters, signal),
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
    queryKey: priceListVersionKeys.currentImpact(
      supplierId,
      versionId,
      filters,
    ),
    queryFn: ({ signal }) =>
      getCurrentPriceImpactApi(supplierId, versionId, filters, signal),
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
    queryKey: priceListVersionKeys.auditEvents(
      supplierId,
      versionId,
      pagination,
    ),
    queryFn: ({ signal }) =>
      listPriceListVersionAuditEventsApi(
        supplierId,
        versionId,
        pagination,
        signal,
      ),
    retry: retryRead,
  });
}

export interface CreateVersionVariables {
  supplierId: string;
  importId: string;
  input: CreatePriceListVersionInput;
}

export function refreshComparisonAfterCreateConflict(
  queryClient: QueryClient,
  error: ApiRequestError,
  variables: CreateVersionVariables,
): Promise<void> | undefined {
  if (error.code !== "PRICE_LIST_BASELINE_CHANGED") return undefined;
  return queryClient.invalidateQueries({
    queryKey: [
      ...priceListVersionKeys.bySupplier(variables.supplierId),
      "import-comparison",
      variables.importId,
    ],
  });
}

export function useCreatePriceListVersionMutation() {
  const queryClient = useQueryClient();
  return useMutation<PriceListVersion, ApiRequestError, CreateVersionVariables>(
    {
      mutationKey: [...priceListVersionKeys.all, "create"],
      mutationFn: ({ supplierId, importId, input }) =>
        createPriceListVersionApi(supplierId, importId, input),
      retry: false,
      throwOnError: false,
      onSuccess: (version, variables) => {
        queryClient.setQueryData(
          priceListVersionKeys.detail(variables.supplierId, version.id),
          version,
        );
        void queryClient.invalidateQueries({
          queryKey: priceListVersionKeys.lists(variables.supplierId),
        });
        void queryClient.invalidateQueries({
          queryKey: priceListImportKeys.detail(
            variables.supplierId,
            variables.importId,
          ),
        });
        void queryClient.invalidateQueries({
          queryKey: [
            ...priceListVersionKeys.bySupplier(variables.supplierId),
            "import-comparison",
            variables.importId,
          ],
        });
      },
      onError: (error, variables) => {
        void refreshComparisonAfterCreateConflict(
          queryClient,
          error,
          variables,
        );
      },
    },
  );
}

interface VersionDecisionVariables<TInput> {
  supplierId: string;
  versionId: string;
  input: TInput;
}

export type ApproveVersionVariables = VersionDecisionVariables<ApprovalInput>;
export type RejectVersionVariables = VersionDecisionVariables<RejectionInput>;

function refreshDecisionQueries(
  queryClient: QueryClient,
  supplierId: string,
  versionId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: priceListVersionKeys.detail(supplierId, versionId),
  });
  void queryClient.invalidateQueries({
    queryKey: priceListVersionKeys.lists(supplierId),
  });
  void queryClient.invalidateQueries({
    queryKey: priceListVersionKeys.current(supplierId),
  });
  void queryClient.invalidateQueries({
    queryKey: supplierKeys.detail(supplierId),
  });
  void queryClient.invalidateQueries({
    queryKey: [
      ...priceListVersionKeys.detail(supplierId, versionId),
      "audit-events",
    ],
  });
}

function refreshAfterDecisionConflict(
  queryClient: QueryClient,
  error: ApiRequestError,
  variables: { supplierId: string; versionId: string },
): void {
  if (error.status !== 409) return;
  refreshDecisionQueries(
    queryClient,
    variables.supplierId,
    variables.versionId,
  );
}

export function useApprovePriceListVersionMutation() {
  const queryClient = useQueryClient();
  return useMutation<ApprovalResult, ApiRequestError, ApproveVersionVariables>({
    mutationKey: [...priceListVersionKeys.all, "approve"],
    mutationFn: ({ supplierId, versionId, input }) =>
      approvePriceListVersionApi(supplierId, versionId, input),
    retry: false,
    throwOnError: false,
    onSuccess: (_, variables) =>
      refreshDecisionQueries(
        queryClient,
        variables.supplierId,
        variables.versionId,
      ),
    onError: (error, variables) =>
      refreshAfterDecisionConflict(queryClient, error, variables),
  });
}

export function useRejectPriceListVersionMutation() {
  const queryClient = useQueryClient();
  return useMutation<ApprovalResult, ApiRequestError, RejectVersionVariables>({
    mutationKey: [...priceListVersionKeys.all, "reject"],
    mutationFn: ({ supplierId, versionId, input }) =>
      rejectPriceListVersionApi(supplierId, versionId, input),
    retry: false,
    throwOnError: false,
    onSuccess: (_, variables) =>
      refreshDecisionQueries(
        queryClient,
        variables.supplierId,
        variables.versionId,
      ),
    onError: (error, variables) =>
      refreshAfterDecisionConflict(queryClient, error, variables),
  });
}
