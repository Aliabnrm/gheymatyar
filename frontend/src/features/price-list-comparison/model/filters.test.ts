import { describe, expect, it } from "vitest";

import type { ComparisonItem } from "@/services/price-list-comparison/price-list-comparison.schema";

import { filterComparisonItems } from "./filters";

const base: ComparisonItem = {
  product_code: "A",
  change_types: ["UNCHANGED"],
  previous: null,
  current: null,
  field_changes: [],
  price_delta_irr: null,
  price_change_percent: null,
  is_high_risk: false,
};

const items: ComparisonItem[] = [
  base,
  { ...base, product_code: "B", change_types: ["ADDED"] },
  {
    ...base,
    product_code: "C",
    change_types: ["PRICE_CHANGED", "PACK_SIZE_CHANGED"],
    is_high_risk: true,
  },
  {
    ...base,
    product_code: "D",
    change_types: ["AVAILABILITY_CHANGED"],
  },
];

describe("comparison filters", () => {
  it("filters independent high risk markers", () => {
    expect(
      filterComparisonItems(items, "high-risk").map(
        (item) => item.product_code,
      ),
    ).toEqual(["C"]);
  });

  it("separates metadata-only rows from price changes", () => {
    expect(
      filterComparisonItems(items, "metadata").map((item) => item.product_code),
    ).toEqual(["D"]);
  });

  it("does not expose the caller's array for the all filter", () => {
    expect(filterComparisonItems(items, "all")).not.toBe(items);
  });
});
