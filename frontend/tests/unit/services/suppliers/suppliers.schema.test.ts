import { describe, expect, it } from "vitest";

import {
  SupplierNameInputSchema,
  SupplierSchema,
  UpdateSupplierInputSchema,
} from "@/services/suppliers";

import {
  SUPPLIER_API_FIXTURE,
  SUPPLIER_FIXTURE,
} from "../../../fixtures/suppliers";

describe("supplier schemas", () => {
  it("maps strict API fields to the frontend model", () => {
    expect(SupplierSchema.parse(SUPPLIER_API_FIXTURE)).toEqual(
      SUPPLIER_FIXTURE,
    );
    expect(
      SupplierSchema.safeParse({
        ...SUPPLIER_API_FIXTURE,
        organization_id: "secret",
      }).success,
    ).toBe(false);
  });

  it("validates and trims supplier form input", () => {
    expect(SupplierNameInputSchema.parse({ name: "  شرکت نمونه  " })).toEqual({
      name: "شرکت نمونه",
    });
    expect(SupplierNameInputSchema.safeParse({ name: "ا" }).success).toBe(
      false,
    );
  });

  it("rejects an empty update", () => {
    expect(UpdateSupplierInputSchema.safeParse({}).success).toBe(false);
    expect(UpdateSupplierInputSchema.parse({ isActive: false })).toEqual({
      isActive: false,
    });
  });
});
