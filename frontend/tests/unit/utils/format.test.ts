import { describe, expect, it } from "vitest";

import { formatIrr, formatPercent, formatPriceDelta } from "@/utils/format";

describe("money formatting", () => {
  it("always labels money as rial", () => {
    expect(formatIrr(12_500_000)).toContain("ریال");
    expect(formatIrr(12_500_000)).not.toContain("تومان");
  });

  it("formats positive and negative deltas", () => {
    expect(formatPriceDelta(1_000)).toMatch(/^\+/);
    expect(formatPriceDelta(-1_000)).not.toMatch(/^\+/);
  });

  it("formats percentage and null", () => {
    expect(formatPercent("9.20")).toContain("٪");
    expect(formatPercent(null)).toBe("—");
  });
});
