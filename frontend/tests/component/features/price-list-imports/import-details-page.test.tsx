import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportDetailsPage } from "@/features/price-list-imports";
import {
  ExtractedRowSchema,
  PriceListImportSchema,
} from "@/services/price-list-imports";

import {
  EXTRACTED_ROW_API_FIXTURE,
  IMPORT_API_FIXTURE,
} from "../../../fixtures/price-list-imports";

vi.mock(
  "@/features/price-list-imports/components/column-mapping-panel",
  () => ({ ColumnMappingPanel: () => <section aria-label="نگاشت ستون‌ها" /> }),
);

vi.mock("@/features/price-list-versions", () => ({
  ImportChangeReview: () => <section aria-label="مقایسه نسخه قیمت" />,
}));

const mocks = vi.hoisted(() => ({
  detail: {} as Record<string, unknown>,
  rows: {} as Record<string, unknown>,
}));

vi.mock("@/services/price-list-imports", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/price-list-imports")>();
  return {
    ...original,
    usePriceListImportQuery: () => mocks.detail,
    useExtractedRowsQuery: () => mocks.rows,
  };
});

beforeEach(() => {
  mocks.detail = {
    isPending: false,
    isError: false,
    data: PriceListImportSchema.parse(IMPORT_API_FIXTURE),
  };
  mocks.rows = {
    isPending: false,
    isError: false,
    data: {
      items: [ExtractedRowSchema.parse(EXTRACTED_ROW_API_FIXTURE)],
      total: 1,
      limit: 50,
      offset: 0,
    },
  };
});

describe("ImportDetailsPage", () => {
  it("renders a draft and its extracted rows without claiming approval", () => {
    render(
      <ImportDetailsPage
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        importId={IMPORT_API_FIXTURE.id}
      />,
    );

    expect(screen.getByText("پیش‌نویس آماده بازبینی")).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "ردیف‌های استخراج‌شده لیست قیمت" }),
    ).toBeInTheDocument();
    expect(screen.getByText("001-A")).toBeInTheDocument();
    expect(
      screen.getByText(/هنوز تأیید یا منتشر نشده‌اند/),
    ).toBeInTheDocument();
  });

  it("renders a blocking error for a failed import and no rows table", () => {
    mocks.detail = {
      isPending: false,
      isError: false,
      data: PriceListImportSchema.parse({
        ...IMPORT_API_FIXTURE,
        status: "FAILED",
        row_count: 0,
        blocking_error: {
          code: "REQUIRED_COLUMN_MISSING",
          message: "ستون‌های اجباری فایل پیدا نشدند.",
          details: { missing_columns: ["price_irr"] },
        },
      }),
    };

    render(
      <ImportDetailsPage
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        importId={IMPORT_API_FIXTURE.id}
      />,
    );

    expect(screen.getByText("استخراج ناموفق")).toBeInTheDocument();
    expect(
      screen.getByText("ستون‌های اجباری فایل پیدا نشدند."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("uses the same safe message for missing and inaccessible imports", () => {
    mocks.detail = {
      isPending: false,
      isError: true,
      error: { status: 404, message: "not found" },
    };

    render(
      <ImportDetailsPage
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        importId={IMPORT_API_FIXTURE.id}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Import موردنظر پیدا نشد.",
    );
  });
});
