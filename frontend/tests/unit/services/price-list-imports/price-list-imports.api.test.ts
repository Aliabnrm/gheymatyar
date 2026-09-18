import { afterEach, describe, expect, it, vi } from "vitest";

import {
  listPriceListImportsApi,
  uploadPriceListImportApi,
} from "@/services/price-list-imports/price-list-imports.api";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";

afterEach(() => vi.unstubAllGlobals());

describe("price-list imports API", () => {
  it("builds multipart in the adapter and adds CSRF without setting content type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(IMPORT_API_FIXTURE), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { cookie: "gheymatyar_csrf=csrf-token" });

    const file = new File(["xlsx"], "prices.xlsx");
    await uploadPriceListImportApi(IMPORT_API_FIXTURE.supplier.id, { file });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.body).toBeInstanceOf(FormData);
    expect(new Headers(request.headers).has("Content-Type")).toBe(false);
    expect(new Headers(request.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("organization");
  });

  it("lists imports without CSRF or organization identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [IMPORT_API_FIXTURE],
          total: 1,
          limit: 20,
          offset: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listPriceListImportsApi(IMPORT_API_FIXTURE.supplier.id, {
      status: "all",
      limit: 20,
      offset: 0,
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).has("X-CSRF-Token")).toBe(false);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("organization");
  });
});
