import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/core/api/api-error";
import { useCurrentPriceImpactReview } from "@/features/price-list-versions/hooks/use-current-price-impact-review";
import { CurrentPriceImpactSchema } from "@/services/price-list-versions";
import {
  CURRENT_PRICE_IMPACT_API_FIXTURE,
  NO_CURRENT_PRICE_IMPACT_API_FIXTURE,
  VERSION_ID,
} from "../../../fixtures/price-list-versions";
import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";

const mocks = vi.hoisted(() => ({ getImpact: vi.fn() }));
vi.mock("@/services/price-list-versions/price-list-versions.api", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/services/price-list-versions/price-list-versions.api")
  >()),
  getCurrentPriceImpactApi: mocks.getImpact,
}));
beforeEach(() => mocks.getImpact.mockReset());

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } },
  });
  const refresh = vi.fn().mockResolvedValue({});
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useCurrentPriceImpactReview(
        IMPORT_API_FIXTURE.supplier.id,
        VERSION_ID,
        "READY_FOR_REVIEW",
        refresh,
      ),
    { wrapper },
  );
  return { ...hook, client, refresh };
}
describe("current impact review with a real query cache", () => {
  it("blocks cached data on conflict and retries the pinned request even if the pin is unchanged", async () => {
    let conflict = false;
    const report = CurrentPriceImpactSchema.parse(CURRENT_PRICE_IMPACT_API_FIXTURE);
    mocks.getImpact.mockImplementation(async (_supplier, _version, filters) => {
      if (conflict && filters.baselineVersionId)
        throw new ApiRequestError("مبنا عوض شد", {
          code: "PRICE_LIST_CURRENT_CHANGED",
          status: 409,
        });
      return report;
    });
    const { result, client, refresh } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const context = result.current.approvalContext?.key;
    conflict = true;
    await act(() => client.invalidateQueries({ queryKey: ["price-list-versions"] }));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.approvalContext).toBeNull();
    expect(result.current.report).toBeUndefined();
    conflict = false;
    act(() => result.current.restart());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.approvalContext?.key).not.toBe(context);
    expect(refresh).toHaveBeenCalledOnce();
  });
  it("restarts with a newly resolved baseline and page zero", async () => {
    let raw = {
      ...CURRENT_PRICE_IMPACT_API_FIXTURE,
      baseline_version: {
        ...CURRENT_PRICE_IMPACT_API_FIXTURE.baseline_version,
        id: String(CURRENT_PRICE_IMPACT_API_FIXTURE.baseline_version.id),
      },
    };
    mocks.getImpact.mockImplementation(async () => CurrentPriceImpactSchema.parse(raw));
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.setOffset(50));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const id = "e17a5531-3709-4780-bb30-359b18747144";
    raw = { ...raw, baseline_version: { ...raw.baseline_version, id } };
    act(() => result.current.restart());
    await waitFor(() => expect(result.current.approvalContext?.expectedCurrentVersionId).toBe(id));
    expect(result.current.filters.offset).toBe(0);
  });
  it("pins the absence of a current version without synthetic comparison rows", async () => {
    mocks.getImpact.mockResolvedValue(
      CurrentPriceImpactSchema.parse(NO_CURRENT_PRICE_IMPACT_API_FIXTURE),
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.approvalContext?.expectedCurrentVersionId).toBeNull();
    expect(mocks.getImpact).toHaveBeenLastCalledWith(
      expect.any(String),
      VERSION_ID,
      expect.objectContaining({ expectNoCurrent: true }),
      expect.any(AbortSignal),
    );
  });
});
