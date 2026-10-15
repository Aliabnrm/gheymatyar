"use client";
import {
  useMutation,
  useQueryClient,
  type MutationFunction,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { ApiRequestError } from "@/core/api/api-error";
import { sessionGeneration } from "./session-cache";

type SessionMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiRequestError, TVariables>,
  "mutationFn"
> & { mutationFn: MutationFunction<TData, TVariables> };

/** A request from an expired workspace must not refill cache or report success. */
export function useSessionMutation<TData, TVariables = void>(
  options: SessionMutationOptions<TData, TVariables>,
) {
  const client = useQueryClient();
  const generation = sessionGeneration(client);
  const assertCurrent = () => {
    if (generation !== sessionGeneration(client)) {
      throw new ApiRequestError("نشست تغییر کرده است؛ عملیات قبلی را دوباره بررسی کنید.", {
        code: "STALE_SESSION",
        status: 0,
      });
    }
  };
  return useMutation<TData, ApiRequestError, TVariables>({
    ...options,
    mutationFn: async (variables, context) => {
      assertCurrent();
      try {
        const result = await options.mutationFn(variables, context);
        assertCurrent();
        return result;
      } catch (error) {
        assertCurrent();
        throw error;
      }
    },
    onSuccess: (...args) => {
      assertCurrent();
      return options.onSuccess?.(...args);
    },
    onError: (...args) => {
      if (generation === sessionGeneration(client)) return options.onError?.(...args);
    },
    onSettled: (...args) => {
      if (generation === sessionGeneration(client)) return options.onSettled?.(...args);
    },
  });
}
