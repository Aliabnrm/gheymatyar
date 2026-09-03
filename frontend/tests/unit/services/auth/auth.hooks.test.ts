import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  clearAuthenticatedData,
  currentAccountQueryKey,
} from "@/services/auth/auth.hooks";

import { AUTH_ACCOUNT_FIXTURE } from "../../../fixtures/auth";

describe("auth cache lifecycle", () => {
  it("clears account, comparison queries and sensitive mutations", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(currentAccountQueryKey, AUTH_ACCOUNT_FIXTURE);
    queryClient.setQueryData(["price-list-comparison", "latest"], {
      secret: "comparison",
    });
    queryClient.setQueryData(["suppliers", "list"], { secret: "supplier" });
    queryClient.getMutationCache().build(queryClient, {
      mutationKey: ["price-list-comparison"],
      mutationFn: async () => null,
    });

    clearAuthenticatedData(queryClient);

    expect(queryClient.getQueryData(currentAccountQueryKey)).toBeNull();
    expect(
      queryClient.getQueryData(["price-list-comparison", "latest"]),
    ).toBeUndefined();
    expect(queryClient.getQueryData(["suppliers", "list"])).toBeUndefined();
    expect(
      queryClient
        .getMutationCache()
        .findAll({ mutationKey: ["price-list-comparison"] }),
    ).toHaveLength(0);
  });
});
