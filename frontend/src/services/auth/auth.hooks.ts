"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { clearSessionCache } from "@/core/query/session-cache";
import { ApiRequestError } from "@/core/api/api-error";

import { getCurrentAccountApi, loginApi, logoutApi, registerApi } from "./auth.api";
import type { AuthContext, LoginInput, RegisterInput } from "./auth.schema";

export const currentAccountQueryKey = ["auth", "me"] as const;

export function useCurrentAccountQuery() {
  return useQuery<AuthContext | null, ApiRequestError>({
    queryKey: currentAccountQueryKey,
    queryFn: ({ signal }) => getCurrentAccountApi(signal),
    retry: (failureCount, error) => error.status !== 401 && failureCount < 1,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation<AuthContext, ApiRequestError, LoginInput>({
    mutationKey: ["auth", "login"],
    mutationFn: loginApi,
    retry: false,
    onSuccess: (account) => storeAuthenticatedAccount(queryClient, account),
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation<AuthContext, ApiRequestError, RegisterInput>({
    mutationKey: ["auth", "register"],
    mutationFn: registerApi,
    retry: false,
    onSuccess: (account) => storeAuthenticatedAccount(queryClient, account),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation<null, ApiRequestError>({
    mutationKey: ["auth", "logout"],
    mutationFn: logoutApi,
    retry: false,
    onSuccess: () => clearAuthenticatedData(queryClient),
  });
}

export function clearAuthenticatedData(queryClient: QueryClient): void {
  clearSessionCache(queryClient);
  queryClient.setQueryData(currentAccountQueryKey, null);
}
function storeAuthenticatedAccount(queryClient: QueryClient, account: AuthContext): void {
  clearSessionCache(queryClient);
  queryClient.setQueryData(currentAccountQueryKey, account);
}
