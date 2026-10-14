import { afterEach, describe, expect, it, vi } from "vitest";

import {
  approvePriceListVersionApi,
  createPriceListVersionApi,
  getCurrentPriceListVersionApi,
  getImportChangeReportApi,
  listPriceListVersionAuditEventsApi,
  rejectPriceListVersionApi,
} from "@/services/price-list-versions/price-list-versions.api";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import {
  APPROVAL_RESULT_API_FIXTURE,
  APPROVED_VERSION_API_FIXTURE,
  AUDIT_EVENT_API_FIXTURE,
  IMPORT_CHANGE_REPORT_API_FIXTURE,
  PREVIOUS_VERSION_ID,
  VERSION_API_FIXTURE,
} from "../../../fixtures/price-list-versions";

afterEach(() => vi.unstubAllGlobals());

describe("price-list versions API", () => {
  it("builds a scoped comparison path with filters and forwards AbortSignal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(IMPORT_CHANGE_REPORT_API_FIXTURE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await getImportChangeReportApi(
      IMPORT_API_FIXTURE.supplier.id,
      IMPORT_API_FIXTURE.id,
      { changeType: "PACK_SIZE_CHANGED", limit: 50, offset: 100 },
      controller.signal,
    );

    const [url, request] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain(
      `/suppliers/${IMPORT_API_FIXTURE.supplier.id}/imports/${IMPORT_API_FIXTURE.id}/comparison`,
    );
    expect(String(url)).toContain("change_type=PACK_SIZE_CHANGED");
    expect(String(url)).toContain("limit=50");
    expect(String(url)).toContain("offset=100");
    expect((request as RequestInit).signal).toBe(controller.signal);
    expect(String(url)).not.toContain("organization");
  });

  it("sends explicit confirmation with CSRF for version creation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(VERSION_API_FIXTURE), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { cookie: "gheymatyar_csrf=csrf-token" });

    await createPriceListVersionApi(
      IMPORT_API_FIXTURE.supplier.id,
      IMPORT_API_FIXTURE.id,
      { expectedPreviousVersionId: PREVIOUS_VERSION_ID, confirmCreate: true },
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.method).toBe("POST");
    expect(new Headers(request.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(JSON.parse(String(request.body))).toEqual({
      expected_previous_version_id: PREVIOUS_VERSION_ID,
      confirm_create: true,
    });
  });

  it("sends approval and rejection decisions with CSRF", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(APPROVAL_RESULT_API_FIXTURE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { cookie: "gheymatyar_csrf=csrf-token" });

    await approvePriceListVersionApi(
      IMPORT_API_FIXTURE.supplier.id,
      VERSION_API_FIXTURE.id,
      {
        expectedCurrentVersionId: PREVIOUS_VERSION_ID,
        confirmApproval: true,
        decisionNote: "بررسی شد",
      },
    );
    await rejectPriceListVersionApi(
      IMPORT_API_FIXTURE.supplier.id,
      VERSION_API_FIXTURE.id,
      { confirmRejection: true, reason: "قیمت نیازمند اصلاح است" },
    );

    const [approveUrl, approveRequest] = fetchMock.mock.calls[0]!;
    expect(String(approveUrl)).toContain(`/${VERSION_API_FIXTURE.id}/approve`);
    expect(new Headers(approveRequest.headers).get("X-CSRF-Token")).toBe(
      "csrf-token",
    );
    expect(JSON.parse(String(approveRequest.body))).toEqual({
      expected_current_version_id: PREVIOUS_VERSION_ID,
      confirm_approval: true,
      decision_note: "بررسی شد",
    });

    const [rejectUrl, rejectRequest] = fetchMock.mock.calls[1]!;
    expect(String(rejectUrl)).toContain(`/${VERSION_API_FIXTURE.id}/reject`);
    expect(JSON.parse(String(rejectRequest.body))).toEqual({
      confirm_rejection: true,
      reason: "قیمت نیازمند اصلاح است",
    });
  });

  it("reads current and paginated audit events with AbortSignal", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ current_version: APPROVED_VERSION_API_FIXTURE }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [AUDIT_EVENT_API_FIXTURE],
            total: 1,
            limit: 20,
            offset: 40,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    const current = await getCurrentPriceListVersionApi(
      IMPORT_API_FIXTURE.supplier.id,
      controller.signal,
    );
    const audit = await listPriceListVersionAuditEventsApi(
      IMPORT_API_FIXTURE.supplier.id,
      VERSION_API_FIXTURE.id,
      { limit: 20, offset: 40 },
      controller.signal,
    );

    expect(current.currentVersion?.isCurrent).toBe(true);
    expect(audit.items[0]?.action).toBe("PRICE_LIST_VERSION_APPROVED");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "limit=20&offset=40",
    );
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).signal).toBe(
      controller.signal,
    );
  });
});
