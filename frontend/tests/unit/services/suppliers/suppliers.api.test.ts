import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSupplierApi,
  listSuppliersApi,
  updateSupplierApi,
} from "@/services/suppliers/suppliers.api";

import { SUPPLIER_API_FIXTURE } from "../../../fixtures/suppliers";

afterEach(() => vi.unstubAllGlobals());

describe("supplier API", () => {
  it("lists suppliers without CSRF and keeps organization out of the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [SUPPLIER_API_FIXTURE],
          total: 1,
          limit: 20,
          offset: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await listSuppliersApi({ status: "active", limit: 20, offset: 0 });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("status=active");
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).has("X-CSRF-Token")).toBe(false);
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("organization");
  });

  it("adds CSRF to create and maps update fields to snake case", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify(SUPPLIER_API_FIXTURE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { cookie: "gheymatyar_csrf=csrf-token" });

    await createSupplierApi({ name: "تأمین‌کننده نمونه" });
    await updateSupplierApi(SUPPLIER_API_FIXTURE.id, { isActive: false });

    const createRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const updateRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(createRequest.headers).get("X-CSRF-Token")).toBe(
      "csrf-token",
    );
    expect(JSON.parse(String(createRequest.body))).toEqual({
      name: "تأمین‌کننده نمونه",
    });
    expect(JSON.parse(String(updateRequest.body))).toEqual({
      is_active: false,
    });
    expect(String(updateRequest.body)).not.toContain("organization_id");
  });
});
