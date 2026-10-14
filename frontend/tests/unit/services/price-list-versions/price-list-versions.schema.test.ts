import { describe, expect, it } from "vitest";

import {
  ApprovalInputSchema,
  CurrentPriceListVersionResponseSchema,
  ImportChangeReportSchema,
  PriceListAuditEventListSchema,
  PriceListVersionItemSchema,
  PriceListVersionSchema,
  RejectionInputSchema,
  ReviewStatusSchema,
} from "@/services/price-list-versions";

import {
  APPROVED_VERSION_API_FIXTURE,
  AUDIT_EVENT_API_FIXTURE,
  IMPORT_CHANGE_REPORT_API_FIXTURE,
  VERSION_API_FIXTURE,
  VERSION_ITEM_API_FIXTURE,
} from "../../../fixtures/price-list-versions";

describe("price-list version schemas", () => {
  it("parses valid versions, items and multi-label reports", () => {
    const version = PriceListVersionSchema.parse(VERSION_API_FIXTURE);
    const item = PriceListVersionItemSchema.parse(VERSION_ITEM_API_FIXTURE);
    const report = ImportChangeReportSchema.parse(
      IMPORT_CHANGE_REPORT_API_FIXTURE,
    );

    expect(version.versionNumber).toBe(2);
    expect(item.productCodeRaw).toBe("001-A");
    expect(report.items[0]?.change_types).toEqual([
      "PRICE_CHANGED",
      "UNIT_CHANGED",
      "PACK_SIZE_CHANGED",
    ]);
  });

  it("rejects incomplete responses and invalid integer money", () => {
    expect(() =>
      PriceListVersionSchema.parse({ ...VERSION_API_FIXTURE, row_count: 0 }),
    ).toThrow();
    expect(() =>
      PriceListVersionItemSchema.parse({
        ...VERSION_ITEM_API_FIXTURE,
        price_irr: 1.5,
      }),
    ).toThrow();
    expect(() =>
      ImportChangeReportSchema.parse({
        ...IMPORT_CHANGE_REPORT_API_FIXTURE,
        created_version: undefined,
      }),
    ).toThrow();
  });

  it("validates review decisions, current null and audit pagination", () => {
    expect(ReviewStatusSchema.parse("APPROVED")).toBe("APPROVED");
    expect(() => ReviewStatusSchema.parse("CURRENT")).toThrow();
    expect(
      CurrentPriceListVersionResponseSchema.parse({ current_version: null }),
    ).toEqual({ currentVersion: null });
    expect(
      CurrentPriceListVersionResponseSchema.parse({
        current_version: APPROVED_VERSION_API_FIXTURE,
      }).currentVersion?.isCurrent,
    ).toBe(true);
    expect(
      PriceListAuditEventListSchema.parse({
        items: [AUDIT_EVENT_API_FIXTURE],
        total: 1,
        limit: 20,
        offset: 0,
      }).items[0]?.actorEmail,
    ).toBe("owner@example.com");
  });

  it("requires explicit confirmation and a bounded rejection reason", () => {
    expect(() =>
      ApprovalInputSchema.parse({
        expectedCurrentVersionId: null,
        confirmApproval: false,
        decisionNote: null,
      }),
    ).toThrow();
    expect(() =>
      RejectionInputSchema.parse({ confirmRejection: true, reason: "   " }),
    ).toThrow();
    expect(
      RejectionInputSchema.parse({
        confirmRejection: true,
        reason: "  تعداد بسته اشتباه است  ",
      }).reason,
    ).toBe("تعداد بسته اشتباه است");
  });
});
