"use client";
import { useSessionMutation } from "@/core/query/use-session-mutation";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "@/core/api/api-error";
import { priceListImportKeys } from "@/services/price-list-imports";
import { supplierKeys } from "@/services/suppliers";
import {
  approvePriceListVersionApi,
  createPriceListVersionApi,
  rejectPriceListVersionApi,
} from "./price-list-versions.api";
import type {
  ApprovalInput,
  ApprovalResult,
  CreatePriceListVersionInput,
  PriceListVersion,
  RejectionInput,
} from "./price-list-versions.schema";
import { priceListVersionKeys } from "./price-list-version.keys";
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
  return useSessionMutation<PriceListVersion, CreateVersionVariables>({
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
        queryKey: priceListImportKeys.detail(variables.supplierId, variables.importId),
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
      void refreshComparisonAfterCreateConflict(queryClient, error, variables);
    },
  });
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
    queryKey: [...priceListVersionKeys.detail(supplierId, versionId), "audit-events"],
  });
}

function refreshAfterDecisionConflict(
  queryClient: QueryClient,
  error: ApiRequestError,
  variables: { supplierId: string; versionId: string },
): void {
  if (error.status !== 409) return;
  refreshDecisionQueries(queryClient, variables.supplierId, variables.versionId);
}

export function useApprovePriceListVersionMutation() {
  const queryClient = useQueryClient();
  return useSessionMutation<ApprovalResult, ApproveVersionVariables>({
    mutationKey: [...priceListVersionKeys.all, "approve"],
    mutationFn: ({ supplierId, versionId, input }) =>
      approvePriceListVersionApi(supplierId, versionId, input),
    retry: false,
    throwOnError: false,
    onSuccess: (_, variables) =>
      refreshDecisionQueries(queryClient, variables.supplierId, variables.versionId),
    onError: (error, variables) => refreshAfterDecisionConflict(queryClient, error, variables),
  });
}

export function useRejectPriceListVersionMutation() {
  const queryClient = useQueryClient();
  return useSessionMutation<ApprovalResult, RejectVersionVariables>({
    mutationKey: [...priceListVersionKeys.all, "reject"],
    mutationFn: ({ supplierId, versionId, input }) =>
      rejectPriceListVersionApi(supplierId, versionId, input),
    retry: false,
    throwOnError: false,
    onSuccess: (_, variables) =>
      refreshDecisionQueries(queryClient, variables.supplierId, variables.versionId),
    onError: (error, variables) => refreshAfterDecisionConflict(queryClient, error, variables),
  });
}
