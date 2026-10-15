import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceListChangeTable } from "@/features/price-list-versions/components/price-list-change-table";
import { ComparisonItemSchema } from "@/services/price-list-comparison/price-list-comparison.schema";
import { IMPORT_CHANGE_REPORT_API_FIXTURE } from "../../../fixtures/price-list-versions";

describe("change details", () => {
  it("shows the current pack and unit for an added product", () => {
    const item = ComparisonItemSchema.parse({
      ...IMPORT_CHANGE_REPORT_API_FIXTURE.items[0],
      change_types: ["ADDED"],
      previous: null,
      is_high_risk: false,
    });
    render(<PriceListChangeTable items={[item]} />);
    expect(screen.getByText(/۱۰ بسته/)).toBeInTheDocument();
  });
  it("exposes metadata before and after rather than just a change badge", () => {
    const item = ComparisonItemSchema.parse({
      ...IMPORT_CHANGE_REPORT_API_FIXTURE.items[0],
      change_types: ["NOTES_CHANGED"],
      field_changes: [{ field: "notes", previous: "توضیح قبلی", current: "توضیح تازه" }],
    });
    render(<PriceListChangeTable items={[item]} />);
    expect(screen.getByText("توضیح قبلی")).toBeInTheDocument();
    expect(screen.getByText("توضیح تازه")).toBeInTheDocument();
  });
});
