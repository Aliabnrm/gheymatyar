import { describe, expect, it } from "vitest";

import { priceListImportKeys } from "@/services/price-list-imports/price-list-imports.hooks";

describe("price-list import query keys", () => {
  it("scopes list, detail and row keys by supplier and import", () => {
    expect(
      priceListImportKeys.list("supplier-a", {
        status: "all",
        limit: 20,
        offset: 0,
      }),
    ).toEqual([
      "price-list-imports",
      "supplier",
      "supplier-a",
      "list",
      { status: "all", limit: 20, offset: 0 },
    ]);
    expect(priceListImportKeys.detail("supplier-a", "import-a")).toEqual([
      "price-list-imports",
      "supplier",
      "supplier-a",
      "detail",
      "import-a",
    ]);
    expect(
      priceListImportKeys.rows("supplier-a", "import-a", {
        limit: 50,
        offset: 0,
      }),
    ).toContain("rows");
  });
});
