"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiRequestError } from "@/core/api/api-error";

import {
  createSupplierApi,
  getSupplierApi,
  listSuppliersApi,
  updateSupplierApi,
} from "./suppliers.api";
import type {
  Supplier,
  SupplierList,
  SupplierListFilters,
  SupplierNameInput,
  UpdateSupplierInput,
} from "./suppliers.schema";

export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (filters: SupplierListFilters) =>
    [...supplierKeys.lists(), filters] as const,
  details: () => [...supplierKeys.all, "detail"] as const,
  detail: (supplierId: string) =>
    [...supplierKeys.details(), supplierId] as const,
};

export function useSuppliersQuery(filters: SupplierListFilters) {
  return useQuery<SupplierList, ApiRequestError>({
    queryKey: supplierKeys.list(filters),
    queryFn: ({ signal }) => listSuppliersApi(filters, signal),
    retry: (count, error) => error.status >= 500 && count < 1,
  });
}

export function useSupplierQuery(supplierId: string) {
  return useQuery<Supplier, ApiRequestError>({
    queryKey: supplierKeys.detail(supplierId),
    queryFn: ({ signal }) => getSupplierApi(supplierId, signal),
    retry: (count, error) => error.status >= 500 && count < 1,
  });
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation<Supplier, ApiRequestError, SupplierNameInput>({
    mutationKey: [...supplierKeys.all, "create"],
    mutationFn: createSupplierApi,
    retry: false,
    onSuccess: (supplier) => {
      queryClient.setQueryData(supplierKeys.detail(supplier.id), supplier);
      void queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

interface UpdateVariables {
  supplierId: string;
  input: UpdateSupplierInput;
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation<Supplier, ApiRequestError, UpdateVariables>({
    mutationKey: [...supplierKeys.all, "update"],
    mutationFn: ({ supplierId, input }) => updateSupplierApi(supplierId, input),
    retry: false,
    onSuccess: (supplier) => {
      queryClient.setQueryData(supplierKeys.detail(supplier.id), supplier);
      void queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}
