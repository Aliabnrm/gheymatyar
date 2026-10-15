import { apiRequest } from "@/core/api/api-client";
import {
  ColumnMappingInputSchema,
  MappingReviewSchema,
  MappingTemplateSchema,
  SaveMappingTemplateSchema,
  type ColumnMapping,
  type SaveMappingTemplate,
} from "./column-mapping.schema";
import { PriceListImportSchema } from "./price-list-imports.schema";

function supplierPath(supplierId: string): `/${string}` {
  return `/api/v1/suppliers/${encodeURIComponent(supplierId)}`;
}
export function getMappingReviewApi(
  supplierId: string,
  importId: string,
  selection?: { sheet_name: string; header_row: number },
  signal?: AbortSignal,
) {
  const query = selection
    ? `?${new URLSearchParams({ sheet_name: selection.sheet_name, header_row: String(selection.header_row) })}`
    : "";
  return apiRequest({
    path: `${supplierPath(supplierId)}/imports/${encodeURIComponent(importId)}/mapping${query}`,
    signal,
    responseSchema: MappingReviewSchema,
  });
}
export function rerunImportApi(supplierId: string, importId: string, mapping: ColumnMapping) {
  return apiRequest({
    path: `${supplierPath(supplierId)}/imports/${encodeURIComponent(importId)}/rerun`,
    method: "POST",
    includeCsrfToken: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ColumnMappingInputSchema.parse(mapping)),
    responseSchema: PriceListImportSchema,
  });
}
export function saveMappingTemplateApi(supplierId: string, input: SaveMappingTemplate) {
  return apiRequest({
    path: `${supplierPath(supplierId)}/mapping-template`,
    method: "POST",
    includeCsrfToken: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(SaveMappingTemplateSchema.parse(input)),
    responseSchema: MappingTemplateSchema,
  });
}
