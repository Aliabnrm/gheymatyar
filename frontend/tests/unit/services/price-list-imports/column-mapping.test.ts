import { describe, expect, it } from "vitest";
import { ColumnMappingInputSchema } from "@/services/price-list-imports/column-mapping.schema";

describe("mapping command validation", () => {
  it("requires code, name and price and rejects reused columns", () => {
    expect(
      ColumnMappingInputSchema.safeParse({
        sheet_name: "Sheet",
        header_row: 1,
        columns: { product_code: 1 },
      }).success,
    ).toBe(false);
    expect(
      ColumnMappingInputSchema.safeParse({
        sheet_name: "Sheet",
        header_row: 1,
        columns: { product_code: 1, product_name: 1, price_irr: 3 },
      }).success,
    ).toBe(false);
    expect(
      ColumnMappingInputSchema.safeParse({
        sheet_name: "Sheet",
        header_row: 2,
        columns: { product_code: 3, product_name: 2, price_irr: 1 },
      }).success,
    ).toBe(true);
  });
});

import { vi, afterEach } from "vitest";
import {
  getMappingReviewApi,
  rerunImportApi,
  saveMappingTemplateApi,
} from "@/services/price-list-imports/column-mapping.api";
import { MAPPING_REVIEW_FIXTURE } from "../../../fixtures/column-mapping";
import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import { MappingReviewSchema } from "@/services/price-list-imports/column-mapping.schema";

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "gheymatyar_csrf=; Max-Age=0; path=/";
});
describe("mapping HTTP contracts", () => {
  it("bounds preview and validates canonical fields", () => {
    expect(MappingReviewSchema.safeParse(MAPPING_REVIEW_FIXTURE).success).toBe(true);
    expect(
      MappingReviewSchema.safeParse({
        ...MAPPING_REVIEW_FIXTURE,
        inspection: {
          ...MAPPING_REVIEW_FIXTURE.inspection,
          preview: Array(6).fill(MAPPING_REVIEW_FIXTURE.inspection.preview[0]),
        },
      }).success,
    ).toBe(false);
  });
  it("sends selection in GET and CSRF only for explicit mutations", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(MAPPING_REVIEW_FIXTURE), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(IMPORT_API_FIXTURE), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: IMPORT_API_FIXTURE.id,
            source_import_id: IMPORT_API_FIXTURE.id,
            created_at: IMPORT_API_FIXTURE.created_at,
            mapping: MAPPING_REVIEW_FIXTURE.inspection.used_mapping,
          }),
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "gheymatyar_csrf=test-token; path=/";
    await getMappingReviewApi("supplier", "import", {
      sheet_name: "Sheet",
      header_row: 2,
    });
    expect(fetchMock.mock.calls[0]![0]).toContain("header_row=2");
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).has("X-CSRF-Token")).toBe(false);
    await rerunImportApi("supplier", "import", MAPPING_REVIEW_FIXTURE.inspection.used_mapping!);
    expect(fetchMock.mock.calls[1]![1].method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[1]![1].headers).get("X-CSRF-Token")).toBe("test-token");
    await saveMappingTemplateApi("supplier", {
      source_import_id: IMPORT_API_FIXTURE.id,
      expected_template_id: IMPORT_API_FIXTURE.id,
      confirm_replace: true,
    });
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body).confirm_replace).toBe(true);
  });
});
