"use client";
import { useSessionMutation } from "@/core/query/use-session-mutation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiRequestError } from "@/core/api/api-error";

import {
  getPriceListImportApi,
  listExtractedRowsApi,
  listPriceListImportsApi,
  uploadPriceListImportApi,
} from "./price-list-imports.api";
import type {
  ExtractedRowList,
  ExtractedRowPagination,
  PriceListImport,
  PriceListImportList,
  PriceListImportListFilters,
  PriceListImportUploadInput,
} from "./price-list-imports.schema";

export const priceListImportKeys = {
  all: ["price-list-imports"] as const,
  bySupplier: (supplierId: string) => [...priceListImportKeys.all, "supplier", supplierId] as const,
  lists: (supplierId: string) => [...priceListImportKeys.bySupplier(supplierId), "list"] as const,
  list: (supplierId: string, filters: PriceListImportListFilters) =>
    [...priceListImportKeys.lists(supplierId), filters] as const,
  details: (supplierId: string) =>
    [...priceListImportKeys.bySupplier(supplierId), "detail"] as const,
  detail: (supplierId: string, importId: string) =>
    [...priceListImportKeys.details(supplierId), importId] as const,
  rows: (supplierId: string, importId: string, pagination: ExtractedRowPagination) =>
    [...priceListImportKeys.detail(supplierId, importId), "rows", pagination] as const,
};

function retryRead(failureCount: number, error: ApiRequestError): boolean {
  return error.status >= 500 && failureCount < 1;
}

export function usePriceListImportsQuery(supplierId: string, filters: PriceListImportListFilters) {
  return useQuery<PriceListImportList, ApiRequestError>({
    queryKey: priceListImportKeys.list(supplierId, filters),
    queryFn: ({ signal }) => listPriceListImportsApi(supplierId, filters, signal),
    retry: retryRead,
  });
}

export function usePriceListImportQuery(supplierId: string, importId: string) {
  return useQuery<PriceListImport, ApiRequestError>({
    queryKey: priceListImportKeys.detail(supplierId, importId),
    queryFn: ({ signal }) => getPriceListImportApi(supplierId, importId, signal),
    retry: retryRead,
  });
}

export function useExtractedRowsQuery(
  supplierId: string,
  importId: string,
  pagination: ExtractedRowPagination,
  enabled: boolean,
) {
  return useQuery<ExtractedRowList, ApiRequestError>({
    queryKey: priceListImportKeys.rows(supplierId, importId, pagination),
    queryFn: ({ signal }) => listExtractedRowsApi(supplierId, importId, pagination, signal),
    retry: retryRead,
    enabled,
  });
}

interface UploadVariables {
  supplierId: string;
  input: PriceListImportUploadInput;
}

export function useUploadPriceListImportMutation() {
  const queryClient = useQueryClient();
  return useSessionMutation<PriceListImport, UploadVariables>({
    mutationKey: [...priceListImportKeys.all, "upload"],
    mutationFn: ({ supplierId, input }) => uploadPriceListImportApi(supplierId, input),
    retry: false,
    onSuccess: (priceListImport, variables) => {
      queryClient.setQueryData(
        priceListImportKeys.detail(variables.supplierId, priceListImport.id),
        priceListImport,
      );
      void queryClient.invalidateQueries({
        queryKey: priceListImportKeys.lists(variables.supplierId),
      });
    },
  });
}
