import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "@/core/api/api-error";
import {
  priceListVersionKeys,
  refreshComparisonAfterCreateConflict,
  useApprovePriceListVersionMutation,
  useCreatePriceListVersionMutation,
  useRejectPriceListVersionMutation,
} from "@/services/price-list-versions/price-list-versions.hooks";
import {
  ApprovalResultSchema,
  PriceListVersionSchema,
} from "@/services/price-list-versions/price-list-versions.schema";
import { supplierKeys } from "@/services/suppliers";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import {
  APPROVAL_RESULT_API_FIXTURE,
  PREVIOUS_VERSION_ID,
  VERSION_API_FIXTURE,
} from "../../../fixtures/price-list-versions";

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  create: vi.fn(),
  reject: vi.fn(),
}));
vi.mock("@/services/price-list-versions/price-list-versions.api", async () => {
  const original = await vi.importActual<
    typeof import("@/services/price-list-versions/price-list-versions.api")
  >("@/services/price-list-versions/price-list-versions.api");
  return {
    ...original,
    approvePriceListVersionApi: mocks.approve,
    createPriceListVersionApi: mocks.create,
    rejectPriceListVersionApi: mocks.reject,
  };
});

beforeEach(() => {
  mocks.approve.mockReset();
  mocks.create.mockReset();
  mocks.reject.mockReset();
});

function testClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(client: QueryClient) {
  function TestQueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return TestQueryWrapper;
}

describe("price-list version hooks", () => {
  it("uses supplier-scoped keys", () => {
    expect(
      priceListVersionKeys.importComparison("supplier-a", "import-a", {
        changeType: null,
        limit: 50,
        offset: 0,
      }),
    ).toEqual([
      "price-list-versions",
      "supplier",
      "supplier-a",
      "import-comparison",
      "import-a",
      { changeType: null, limit: 50, offset: 0 },
    ]);
    expect(priceListVersionKeys.detail("supplier-a", "version-a")).not.toEqual(
      priceListVersionKeys.detail("supplier-b", "version-a"),
    );
    expect(
      priceListVersionKeys.currentImpact("supplier-a", "version-a", {
        baselineVersionId: PREVIOUS_VERSION_ID,
        expectNoCurrent: false,
        changeType: "PRICE_CHANGED",
        limit: 50,
        offset: 0,
      }),
    ).toEqual([
      "price-list-versions",
      "supplier",
      "supplier-a",
      "detail",
      "version-a",
      "current-impact",
      {
        baselineVersionId: PREVIOUS_VERSION_ID,
        expectNoCurrent: false,
        changeType: "PRICE_CHANGED",
        limit: 50,
        offset: 0,
      },
    ]);
  });

  it("does not retry creation and invalidates only the affected supplier", async () => {
    const client = testClient();
    const supplierId = IMPORT_API_FIXTURE.supplier.id;
    const importId = IMPORT_API_FIXTURE.id;
    const otherKey = priceListVersionKeys.list("other-supplier", {
      limit: 20,
      offset: 0,
    });
    const listKey = priceListVersionKeys.list(supplierId, {
      limit: 20,
      offset: 0,
    });
    const comparisonKey = priceListVersionKeys.importComparison(supplierId, importId, {
      changeType: null,
      limit: 50,
      offset: 0,
    });
    client.setQueryData(listKey, {});
    client.setQueryData(comparisonKey, {});
    client.setQueryData(otherKey, {});
    mocks.create.mockResolvedValue(PriceListVersionSchema.parse(VERSION_API_FIXTURE));
    const { result } = renderHook(() => useCreatePriceListVersionMutation(), {
      wrapper: createWrapper(client),
    });

    await act(() =>
      result.current.mutateAsync({
        supplierId,
        importId,
        input: {
          expectedPreviousVersionId: PREVIOUS_VERSION_ID,
          confirmCreate: true,
        },
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(comparisonKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
    client.clear();
  });

  it("refreshes only the scoped comparison after a baseline conflict", async () => {
    const client = testClient();
    const supplierId = IMPORT_API_FIXTURE.supplier.id;
    const importId = IMPORT_API_FIXTURE.id;
    const comparisonKey = priceListVersionKeys.importComparison(supplierId, importId, {
      changeType: null,
      limit: 50,
      offset: 0,
    });
    client.setQueryData(comparisonKey, {});
    await refreshComparisonAfterCreateConflict(
      client,
      new ApiRequestError("مبنا تغییر کرده است.", {
        code: "PRICE_LIST_BASELINE_CHANGED",
        status: 409,
      }),
      {
        supplierId,
        importId,
        input: {
          expectedPreviousVersionId: PREVIOUS_VERSION_ID,
          confirmCreate: true,
        },
      },
    );

    expect(client.getQueryState(comparisonKey)?.isInvalidated).toBe(true);
    client.clear();
  });

  it.each([
    ["approve", useApprovePriceListVersionMutation, mocks.approve],
    ["reject", useRejectPriceListVersionMutation, mocks.reject],
  ] as const)(
    "does not retry %s and refreshes all decision read models",
    async (_, useDecisionMutation, decisionMock) => {
      const client = testClient();
      const supplierId = IMPORT_API_FIXTURE.supplier.id;
      const versionId = VERSION_API_FIXTURE.id;
      const detailKey = priceListVersionKeys.detail(supplierId, versionId);
      const listKey = priceListVersionKeys.list(supplierId, {
        limit: 20,
        offset: 0,
      });
      const currentKey = priceListVersionKeys.current(supplierId);
      const auditKey = priceListVersionKeys.auditEvents(supplierId, versionId, {
        limit: 20,
        offset: 0,
      });
      const impactKey = priceListVersionKeys.currentImpact(supplierId, versionId, {
        baselineVersionId: PREVIOUS_VERSION_ID,
        expectNoCurrent: false,
        changeType: null,
        limit: 50,
        offset: 0,
      });
      const supplierKey = supplierKeys.detail(supplierId);
      for (const key of [detailKey, listKey, currentKey, auditKey, impactKey, supplierKey]) {
        client.setQueryData(key, {});
      }
      decisionMock.mockResolvedValue(ApprovalResultSchema.parse(APPROVAL_RESULT_API_FIXTURE));
      const { result } = renderHook(() => useDecisionMutation(), {
        wrapper: createWrapper(client),
      });

      await act(() =>
        result.current.mutateAsync({
          supplierId,
          versionId,
          input:
            useDecisionMutation === useApprovePriceListVersionMutation
              ? {
                  expectedCurrentVersionId: PREVIOUS_VERSION_ID,
                  confirmApproval: true,
                  decisionNote: null,
                }
              : {
                  confirmRejection: true,
                  reason: "قیمت نادرست است",
                },
        } as never),
      );

      expect(decisionMock).toHaveBeenCalledTimes(1);
      for (const key of [detailKey, listKey, currentKey, auditKey, impactKey, supplierKey]) {
        expect(client.getQueryState(key)?.isInvalidated).toBe(true);
      }
      client.clear();
    },
  );

  it("refreshes current decision data after a conflict without retrying", async () => {
    const client = testClient();
    const supplierId = IMPORT_API_FIXTURE.supplier.id;
    const versionId = VERSION_API_FIXTURE.id;
    const currentKey = priceListVersionKeys.current(supplierId);
    const detailKey = priceListVersionKeys.detail(supplierId, versionId);
    client.setQueryData(currentKey, {});
    client.setQueryData(detailKey, {});
    mocks.approve.mockRejectedValue(
      new ApiRequestError("تعارض", {
        code: "CURRENT_PRICE_VERSION_CHANGED",
        status: 409,
      }),
    );
    const { result } = renderHook(() => useApprovePriceListVersionMutation(), {
      wrapper: createWrapper(client),
    });

    await expect(
      act(() =>
        result.current.mutateAsync({
          supplierId,
          versionId,
          input: {
            expectedCurrentVersionId: PREVIOUS_VERSION_ID,
            confirmApproval: true,
            decisionNote: null,
          },
        }),
      ),
    ).rejects.toThrow("تعارض");

    expect(mocks.approve).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(currentKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(detailKey)?.isInvalidated).toBe(true);
    client.clear();
  });
});
