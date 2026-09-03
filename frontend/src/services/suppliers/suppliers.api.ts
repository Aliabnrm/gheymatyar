import { apiRequest } from "@/core/api/api-client";

import {
  SupplierListFiltersSchema,
  SupplierListSchema,
  SupplierNameInputSchema,
  SupplierSchema,
  UpdateSupplierInputSchema,
  type Supplier,
  type SupplierList,
  type SupplierListFilters,
  type SupplierNameInput,
  type UpdateSupplierInput,
} from "./suppliers.schema";

const SUPPLIERS_PATH = "/api/v1/suppliers" as const;

export function listSuppliersApi(
  filters: SupplierListFilters,
  signal?: AbortSignal,
): Promise<SupplierList> {
  const parsed = SupplierListFiltersSchema.parse(filters);
  const query = new URLSearchParams({
    status: parsed.status,
    limit: String(parsed.limit),
    offset: String(parsed.offset),
  });
  return apiRequest({
    path: `${SUPPLIERS_PATH}?${query}`,
    signal,
    responseSchema: SupplierListSchema,
  });
}

export function getSupplierApi(
  supplierId: string,
  signal?: AbortSignal,
): Promise<Supplier> {
  return apiRequest({
    path: `${SUPPLIERS_PATH}/${encodeURIComponent(supplierId)}`,
    signal,
    responseSchema: SupplierSchema,
  });
}

export function createSupplierApi(input: SupplierNameInput): Promise<Supplier> {
  const payload = SupplierNameInputSchema.parse(input);
  return apiRequest({
    path: SUPPLIERS_PATH,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    includeCsrfToken: true,
    responseSchema: SupplierSchema,
  });
}

export function updateSupplierApi(
  supplierId: string,
  input: UpdateSupplierInput,
): Promise<Supplier> {
  const payload = UpdateSupplierInputSchema.parse(input);
  return apiRequest({
    path: `${SUPPLIERS_PATH}/${encodeURIComponent(supplierId)}`,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: payload.name, is_active: payload.isActive }),
    includeCsrfToken: true,
    responseSchema: SupplierSchema,
  });
}
