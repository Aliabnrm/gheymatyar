import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { clearSessionCache } from "@/core/query/session-cache";
import { useSessionMutation } from "@/core/query/use-session-mutation";

describe("session cache isolation", () => {
  it("removes every workspace namespace and version mutation, preserving auth", () => {
    const client = new QueryClient();
    client.setQueryData(["auth", "me"], { user: "current" });
    client.setQueryData(["future-feature"], { private: true });
    client.getMutationCache().build(client, { mutationKey: ["price-list-versions", "create"] });
    clearSessionCache(client);
    expect(client.getQueryData(["future-feature"])).toBeUndefined();
    expect(client.getQueryData(["auth", "me"])).toEqual({ user: "current" });
    expect(client.getMutationCache().getAll()).toHaveLength(0);
  });
  it("rejects a late success instead of refilling the previous session cache", async () => {
    const client = new QueryClient();
    let finish!: (value: string) => void;
    const request = new Promise<string>((resolve) => {
      finish = resolve;
    });
    const success = vi.fn((value: string) => {
      client.setQueryData(["private-result"], value);
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useSessionMutation({
          mutationKey: ["private"],
          mutationFn: () => request,
          onSuccess: success,
        }),
      { wrapper },
    );
    let pending!: Promise<string>;
    await act(async () => {
      pending = result.current.mutateAsync();
      await Promise.resolve();
    });
    clearSessionCache(client);
    await act(async () => {
      const assertion = expect(pending).rejects.toMatchObject({
        code: "STALE_SESSION",
      });
      finish("previous account");
      await assertion;
    });
    expect(success).not.toHaveBeenCalled();
    expect(client.getQueryData(["private-result"])).toBeUndefined();
  });
});
