"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError } from "@/core/api/api-error";
import {
  getMappingReviewApi,
  rerunImportApi,
  saveMappingTemplateApi,
} from "./column-mapping.api";
import type {
  ColumnMapping,
  MappingReview,
  MappingTemplate,
  SaveMappingTemplate,
} from "./column-mapping.schema";
import { priceListImportKeys } from "./price-list-imports.hooks";
import type { PriceListImport } from "./price-list-imports.schema";

export const mappingKeys = {
  review: (
    supplierId: string,
    importId: string,
    selection?: { sheet_name: string; header_row: number },
  ) =>
    [
      ...priceListImportKeys.detail(supplierId, importId),
      "mapping",
      selection ?? null,
    ] as const,
};
export function useMappingReviewQuery(
  supplierId: string,
  importId: string,
  selection?: { sheet_name: string; header_row: number },
) {
  return useQuery<MappingReview, ApiRequestError>({
    queryKey: mappingKeys.review(supplierId, importId, selection),
    queryFn: ({ signal }) =>
      getMappingReviewApi(supplierId, importId, selection, signal),
    retry: false,
  });
}
export function useRerunImportMutation(supplierId: string, importId: string) {
  const client = useQueryClient();
  return useMutation<PriceListImport, ApiRequestError, ColumnMapping>({
    mutationKey: [...priceListImportKeys.all, "rerun"],
    mutationFn: (mapping) => rerunImportApi(supplierId, importId, mapping),
    retry: false,
    onSuccess: async (result) => {
      await client.invalidateQueries({
        queryKey: priceListImportKeys.bySupplier(supplierId),
      });
      client.setQueryData(
        priceListImportKeys.detail(supplierId, result.id),
        result,
      );
    },
  });
}
export function useSaveMappingTemplateMutation(supplierId: string) {
  const client = useQueryClient();
  return useMutation<MappingTemplate, ApiRequestError, SaveMappingTemplate>({
    mutationKey: [...priceListImportKeys.all, "save-template"],
    mutationFn: (input) => saveMappingTemplateApi(supplierId, input),
    retry: false,
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: priceListImportKeys.bySupplier(supplierId),
      }),
  });
}
