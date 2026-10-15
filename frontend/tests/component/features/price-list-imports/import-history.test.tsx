import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportHistory } from "@/features/price-list-imports";
import { PriceListImportSchema } from "@/services/price-list-imports";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";

const mocks = vi.hoisted(() => ({
  imports: {} as Record<string, unknown>,
}));

vi.mock("@/services/price-list-imports", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/price-list-imports")>();
  return {
    ...original,
    usePriceListImportsQuery: () => mocks.imports,
  };
});

beforeEach(() => {
  mocks.imports = {
    isPending: false,
    isError: false,
    data: { items: [], total: 0, limit: 20, offset: 0 },
  };
});

describe("ImportHistory", () => {
  it("shows an upload action and an empty state for an active supplier", () => {
    render(<ImportHistory supplierId={IMPORT_API_FIXTURE.supplier.id} supplierIsActive />);

    expect(screen.getByRole("link", { name: "بارگذاری فایل قیمت" })).toBeInTheDocument();
    expect(screen.getByText("فایلی در این وضعیت وجود ندارد.")).toBeInTheDocument();
  });

  it("keeps history readable but disables new upload for an inactive supplier", () => {
    mocks.imports = {
      isPending: false,
      isError: false,
      data: {
        items: [PriceListImportSchema.parse(IMPORT_API_FIXTURE)],
        total: 1,
        limit: 20,
        offset: 0,
      },
    };
    render(<ImportHistory supplierId={IMPORT_API_FIXTURE.supplier.id} supplierIsActive={false} />);

    expect(screen.queryByRole("link", { name: "بارگذاری فایل قیمت" })).not.toBeInTheDocument();
    expect(screen.getByText("پیش‌نویس آماده بازبینی")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "price-list.xlsx" })).toBeInTheDocument();
  });
});
