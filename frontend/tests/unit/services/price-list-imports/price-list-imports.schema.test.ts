import { describe, expect, it } from "vitest";

import {
  ExtractedRowSchema,
  PriceListImportSchema,
  PriceListImportUploadInputSchema,
} from "@/services/price-list-imports/price-list-imports.schema";

import {
  EXTRACTED_ROW_API_FIXTURE,
  IMPORT_API_FIXTURE,
} from "../../../fixtures/price-list-imports";

describe("price-list import schemas", () => {
  it("validates and maps import payloads to camel case", () => {
    const parsed = PriceListImportSchema.parse(IMPORT_API_FIXTURE);

    expect(parsed.rowCount).toBe(1);
    expect(parsed.sourceDocument.originalFilename).toBe("price-list.xlsx");
    expect(parsed.blockingError).toBeNull();
  });

  it("validates and maps extracted rows", () => {
    const parsed = ExtractedRowSchema.parse(EXTRACTED_ROW_API_FIXTURE);

    expect(parsed.sourceRowNumber).toBe(2);
    expect(parsed.priceIrr).toBe(12_500_000);
    expect(parsed.rawRow).toEqual({ code: "001-A" });
  });

  it("rejects unknown response fields", () => {
    expect(() =>
      PriceListImportSchema.parse({
        ...IMPORT_API_FIXTURE,
        object_key: "leak",
      }),
    ).toThrow();
  });

  it("only accepts one bounded XLSX file", () => {
    const valid = new File(["xlsx"], "prices.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const invalid = new File(["csv"], "prices.csv", { type: "text/csv" });

    expect(PriceListImportUploadInputSchema.safeParse({ file: valid }).success).toBe(true);
    expect(PriceListImportUploadInputSchema.safeParse({ file: invalid }).success).toBe(false);
  });
});
