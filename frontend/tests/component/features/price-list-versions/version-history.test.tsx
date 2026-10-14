import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VersionHistory } from "@/features/price-list-versions";
import { PriceListVersionSchema } from "@/services/price-list-versions";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import { VERSION_API_FIXTURE } from "../../../fixtures/price-list-versions";

const mocks = vi.hoisted(() => ({
  versions: {} as Record<string, unknown>,
}));

vi.mock("@/services/price-list-versions", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/price-list-versions")>();
  return { ...original, usePriceListVersionsQuery: () => mocks.versions };
});

beforeEach(() => {
  mocks.versions = {
    isPending: false,
    isError: false,
    data: {
      items: [PriceListVersionSchema.parse(VERSION_API_FIXTURE)],
      total: 1,
      limit: 20,
      offset: 0,
    },
  };
});

describe("VersionHistory", () => {
  it("renders version metadata and review status", () => {
    render(<VersionHistory supplierId={IMPORT_API_FIXTURE.supplier.id} />);

    expect(screen.getByRole("link", { name: "نسخه ۲" })).toHaveAttribute(
      "href",
      `/suppliers/${IMPORT_API_FIXTURE.supplier.id}/price-list-versions/${VERSION_API_FIXTURE.id}`,
    );
    expect(screen.getByText(/۲۴ کالا/)).toBeInTheDocument();
    expect(screen.getByText("آماده بررسی")).toBeInTheDocument();
    expect(screen.queryByText("قیمت جاری")).not.toBeInTheDocument();
  });

  it("renders loading, empty and server-error states", () => {
    mocks.versions = { isPending: true, isError: false };
    const view = render(
      <VersionHistory supplierId={IMPORT_API_FIXTURE.supplier.id} />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();

    mocks.versions = {
      isPending: false,
      isError: false,
      data: { items: [], total: 0, limit: 20, offset: 0 },
    };
    view.rerender(
      <VersionHistory supplierId={IMPORT_API_FIXTURE.supplier.id} />,
    );
    expect(screen.getByText(/هنوز نسخه‌ای ثبت نشده است/)).toBeInTheDocument();

    mocks.versions = {
      isPending: false,
      isError: true,
      error: { message: "خطای موقت سرور" },
      refetch: vi.fn(),
    };
    view.rerender(
      <VersionHistory supplierId={IMPORT_API_FIXTURE.supplier.id} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("خطای موقت سرور");
  });
});
