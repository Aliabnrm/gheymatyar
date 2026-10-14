import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportChangeReview } from "@/features/price-list-versions";
import { ImportChangeReportSchema } from "@/services/price-list-versions";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import {
  FIRST_IMPORT_CHANGE_REPORT_API_FIXTURE,
  IMPORT_CHANGE_REPORT_API_FIXTURE,
  VERSION_API_FIXTURE,
} from "../../../fixtures/price-list-versions";

const mocks = vi.hoisted(() => ({
  comparison: {} as Record<string, unknown>,
  supplier: {} as Record<string, unknown>,
  create: {} as Record<string, unknown>,
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/services/price-list-versions", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/price-list-versions")>();
  return {
    ...original,
    useImportChangeReportQuery: () => mocks.comparison,
    useCreatePriceListVersionMutation: () => mocks.create,
  };
});

vi.mock("@/services/suppliers", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/suppliers")>();
  return { ...original, useSupplierQuery: () => mocks.supplier };
});

beforeEach(() => {
  mocks.comparison = {
    isPending: false,
    isError: false,
    data: ImportChangeReportSchema.parse(IMPORT_CHANGE_REPORT_API_FIXTURE),
    refetch: vi.fn(),
  };
  mocks.supplier = {
    isPending: false,
    isError: false,
    data: { isActive: true },
    refetch: vi.fn(),
  };
  mocks.create = {
    isPending: false,
    isError: false,
    mutateAsync: vi.fn(),
  };
});

function renderReview() {
  return render(
    <ImportChangeReview
      supplierId={IMPORT_API_FIXTURE.supplier.id}
      importId={IMPORT_API_FIXTURE.id}
    />,
  );
}

describe("ImportChangeReview", () => {
  it("renders loading and safe server error states", () => {
    mocks.comparison = { isPending: true };
    const view = renderReview();
    expect(screen.getByRole("status")).toHaveAccessibleName(
      "در حال دریافت مقایسه نسخه قیمت",
    );

    mocks.comparison = {
      isPending: false,
      isError: true,
      error: { message: "سرویس در دسترس نیست." },
      refetch: vi.fn(),
    };
    view.rerender(
      <ImportChangeReview
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        importId={IMPORT_API_FIXTURE.id}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("سرویس در دسترس نیست.");
  });

  it("explains the first-version state and renders explicit creation", () => {
    mocks.comparison = {
      isPending: false,
      isError: false,
      data: ImportChangeReportSchema.parse(
        FIRST_IMPORT_CHANGE_REPORT_API_FIXTURE,
      ),
      refetch: vi.fn(),
    };
    renderReview();

    expect(screen.getByText("اولین نسخه این تأمین‌کننده")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ساخت نسخه تغییرناپذیر" }),
    ).toBeDisabled();
  });

  it("renders semantic multi-label changes, leading zeroes and untrusted text safely", () => {
    renderReview();

    expect(
      screen.getByRole("table", { name: "جزئیات تغییرات نسخه قیمت" }),
    ).toBeInTheDocument();
    expect(screen.getByText("001-A")).toBeInTheDocument();
    expect(screen.getByText("تغییر قیمت")).toBeInTheDocument();
    expect(screen.getByText("تغییر واحد فروش")).toBeInTheDocument();
    expect(screen.getByText("تغییر تعداد در بسته")).toBeInTheDocument();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/۱۵٬۰۰۰٬۰۰۰ ریال/)).toBeInTheDocument();
    expect(screen.getByText(/۲۰/)).toBeInTheDocument();
  });

  it("replaces duplicate creation with a link to the existing version", () => {
    mocks.comparison = {
      isPending: false,
      isError: false,
      data: ImportChangeReportSchema.parse({
        ...IMPORT_CHANGE_REPORT_API_FIXTURE,
        created_version: VERSION_API_FIXTURE,
      }),
      refetch: vi.fn(),
    };
    renderReview();

    expect(
      screen.getByRole("link", { name: "مشاهده نسخه ثبت‌شده" }),
    ).toHaveAttribute(
      "href",
      `/suppliers/${IMPORT_API_FIXTURE.supplier.id}/price-list-versions/${VERSION_API_FIXTURE.id}`,
    );
    expect(
      screen.queryByRole("button", { name: "ساخت نسخه تغییرناپذیر" }),
    ).not.toBeInTheDocument();
  });

  it("makes inactive suppliers read-only", () => {
    mocks.supplier = {
      isPending: false,
      isError: false,
      data: { isActive: false },
      refetch: vi.fn(),
    };
    renderReview();

    expect(screen.getByText(/تأمین‌کننده غیرفعال است/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ساخت نسخه تغییرناپذیر" }),
    ).toBeDisabled();
  });
});
