import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import {
  useRerunImportMutation,
  useSaveMappingTemplateMutation,
  mappingKeys,
} from "@/services/price-list-imports/column-mapping.hooks";
import { priceListImportKeys } from "@/services/price-list-imports/price-list-imports.hooks";
import { PriceListImportSchema } from "@/services/price-list-imports/price-list-imports.schema";
import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import { MAPPING_REVIEW_FIXTURE } from "../../../fixtures/column-mapping";
const mocks = vi.hoisted(() => ({ rerun: vi.fn(), save: vi.fn() }));
vi.mock("@/services/price-list-imports/column-mapping.api", () => ({
  rerunImportApi: mocks.rerun,
  saveMappingTemplateApi: mocks.save,
}));

describe("mapping cache lifecycle", () => {
  it("invalidates history, original detail, rows and mapping after a rerun, scoped to supplier", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const supplier = IMPORT_API_FIXTURE.supplier.id;
    const id = IMPORT_API_FIXTURE.id;
    const keys = [
      priceListImportKeys.list(supplier, {
        status: "all",
        limit: 20,
        offset: 0,
      }),
      priceListImportKeys.detail(supplier, id),
      priceListImportKeys.rows(supplier, id, { limit: 50, offset: 0 }),
      mappingKeys.review(supplier, id),
    ];
    keys.forEach((key) => client.setQueryData(key, {}));
    client.setQueryData(priceListImportKeys.detail("other", id), {});
    const resultImport = PriceListImportSchema.parse({
      ...IMPORT_API_FIXTURE,
      id: "0ec31921-499d-41a8-bfc9-a26029492282",
    });
    mocks.rerun.mockResolvedValue(resultImport);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useRerunImportMutation(supplier, id), {
      wrapper,
    });
    await act(() =>
      result.current.mutateAsync(
        MAPPING_REVIEW_FIXTURE.inspection.used_mapping!,
      ),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    keys.forEach((key) =>
      expect(client.getQueryState(key)?.isInvalidated).toBe(true),
    );
    expect(
      client.getQueryState(priceListImportKeys.detail("other", id))
        ?.isInvalidated,
    ).toBe(false);
    expect(
      client.getQueryData(
        priceListImportKeys.detail(supplier, resultImport.id),
      ),
    ).toEqual(resultImport);
    client.clear();
  });
  it("refreshes the saved template after explicit saving", async () => {
    const client = new QueryClient();
    const key = mappingKeys.review("supplier", "import");
    client.setQueryData(key, {});
    mocks.save.mockResolvedValue({ id: "template" });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useSaveMappingTemplateMutation("supplier"),
      { wrapper },
    );
    await act(() =>
      result.current.mutateAsync({ source_import_id: IMPORT_API_FIXTURE.id }),
    );
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    client.clear();
  });
});
