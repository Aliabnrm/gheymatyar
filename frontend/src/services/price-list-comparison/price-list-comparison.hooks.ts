import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { comparePriceListsApi } from "./price-list-comparison.api";
import type {
  ComparePriceListsInput,
  ComparisonResponse,
} from "./price-list-comparison.schema";

const comparePriceListsMutationKey = [
  "price-list-comparison",
  "compare",
] as const;

export function useComparePriceListsMutation() {
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => activeRequest.current?.abort();
  }, []);

  return useMutation<ComparisonResponse, unknown, ComparePriceListsInput>({
    mutationKey: comparePriceListsMutationKey,
    retry: false,
    mutationFn: async (input) => {
      activeRequest.current?.abort();
      const controller = new AbortController();
      activeRequest.current = controller;

      try {
        return await comparePriceListsApi(input, controller.signal);
      } finally {
        if (activeRequest.current === controller) {
          activeRequest.current = null;
        }
      }
    },
  });
}
