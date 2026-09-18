import { apiRequest } from "@/core/api/api-client";

import {
  ExtractedRowListSchema,
  ExtractedRowPaginationSchema,
  PriceListImportListFiltersSchema,
  PriceListImportListSchema,
  PriceListImportSchema,
  PriceListImportUploadInputSchema,
  type ExtractedRowList,
  type ExtractedRowPagination,
  type PriceListImport,
  type PriceListImportList,
  type PriceListImportListFilters,
  type PriceListImportUploadInput,
} from "./price-list-imports.schema";

function importsPath(supplierId: string): `/${string}` {
  return `/api/v1/suppliers/${encodeURIComponent(supplierId)}/imports`;
}

export function uploadPriceListImportApi(
  supplierId: string,
  input: PriceListImportUploadInput,
): Promise<PriceListImport> {
  const parsed = PriceListImportUploadInputSchema.parse(input);
  const body = new FormData();
  body.set("file", parsed.file);

  return apiRequest({
    path: importsPath(supplierId),
    method: "POST",
    body,
    includeCsrfToken: true,
    responseSchema: PriceListImportSchema,
  });
}

export function listPriceListImportsApi(
  supplierId: string,
  filters: PriceListImportListFilters,
  signal?: AbortSignal,
): Promise<PriceListImportList> {
  const parsed = PriceListImportListFiltersSchema.parse(filters);
  const query = new URLSearchParams({
    status: parsed.status,
    limit: String(parsed.limit),
    offset: String(parsed.offset),
  });
  return apiRequest({
    path: `${importsPath(supplierId)}?${query}`,
    signal,
    responseSchema: PriceListImportListSchema,
  });
}

export function getPriceListImportApi(
  supplierId: string,
  importId: string,
  signal?: AbortSignal,
): Promise<PriceListImport> {
  return apiRequest({
    path: `${importsPath(supplierId)}/${encodeURIComponent(importId)}`,
    signal,
    responseSchema: PriceListImportSchema,
  });
}

export function listExtractedRowsApi(
  supplierId: string,
  importId: string,
  pagination: ExtractedRowPagination,
  signal?: AbortSignal,
): Promise<ExtractedRowList> {
  const parsed = ExtractedRowPaginationSchema.parse(pagination);
  const query = new URLSearchParams({
    limit: String(parsed.limit),
    offset: String(parsed.offset),
  });
  return apiRequest({
    path: `${importsPath(supplierId)}/${encodeURIComponent(importId)}/rows?${query}`,
    signal,
    responseSchema: ExtractedRowListSchema,
  });
}
