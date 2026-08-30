import { describe, expect, it } from "vitest";

import {
  ComparePriceListsInputSchema,
  ComparisonResponseSchema,
} from "@/services/price-list-comparison/price-list-comparison.schema";

const validSummary = {
  old_items: 0,
  new_items: 0,
  added: 0,
  removed: 0,
  price_changed: 0,
  price_increased: 0,
  price_decreased: 0,
  metadata_only_changed: 0,
  unchanged: 0,
  high_risk: 0,
};

describe("ComparePriceListsInputSchema", () => {
  it("accepts two browser files", () => {
    const input = {
      oldFile: new File([], "old.xlsx"),
      newFile: new File([], "new.xlsx"),
    };

    expect(ComparePriceListsInputSchema.parse(input)).toEqual(input);
  });

  it("rejects values that are not files", () => {
    expect(
      ComparePriceListsInputSchema.safeParse({
        oldFile: "old.xlsx",
        newFile: "new.xlsx",
      }).success,
    ).toBe(false);
  });
});

describe("ComparisonResponseSchema", () => {
  it("accepts a valid versioned IRR response", () => {
    const payload = {
      api_version: "1",
      currency: "IRR",
      summary: validSummary,
      items: [],
    };

    expect(ComparisonResponseSchema.parse(payload)).toEqual(payload);
  });

  it("rejects a response with an unexpected currency", () => {
    const result = ComparisonResponseSchema.safeParse({
      api_version: "1",
      currency: "IRT",
      summary: validSummary,
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed nested items", () => {
    const result = ComparisonResponseSchema.safeParse({
      api_version: "1",
      currency: "IRR",
      summary: validSummary,
      items: [{ product_code: "A" }],
    });

    expect(result.success).toBe(false);
  });

  it("requires at least one product version on every comparison row", () => {
    const result = ComparisonResponseSchema.safeParse({
      api_version: "1",
      currency: "IRR",
      summary: validSummary,
      items: [
        {
          product_code: "A",
          change_types: ["UNCHANGED"],
          previous: null,
          current: null,
          field_changes: [],
          price_delta_irr: null,
          price_change_percent: null,
          is_high_risk: false,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
