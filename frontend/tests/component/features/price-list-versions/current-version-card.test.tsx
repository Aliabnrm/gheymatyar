import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CurrentVersionCard } from "@/features/price-list-versions";
import { PriceListVersionSchema } from "@/services/price-list-versions";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import { APPROVED_VERSION_API_FIXTURE } from "../../../fixtures/price-list-versions";

const mocks = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/services/price-list-versions", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/price-list-versions")>();
  return { ...original, useCurrentPriceListVersionQuery: () => mocks.current };
});

beforeEach(() => {
  mocks.current = {
    isPending: false,
    isError: false,
    data: {
      currentVersion: PriceListVersionSchema.parse(
        APPROVED_VERSION_API_FIXTURE,
      ),
    },
  };
});

describe("CurrentVersionCard", () => {
  it("shows the approved current version", () => {
    render(<CurrentVersionCard supplierId={IMPORT_API_FIXTURE.supplier.id} />);

    expect(screen.getByRole("link", { name: "نسخه ۲" })).toBeInTheDocument();
    expect(screen.getByText("تأییدشده")).toBeInTheDocument();
    expect(screen.getByText("قیمت جاری")).toBeInTheDocument();
  });

  it("shows loading, empty and server-error states", () => {
    mocks.current = { isPending: true, isError: false };
    const view = render(
      <CurrentVersionCard supplierId={IMPORT_API_FIXTURE.supplier.id} />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();

    mocks.current = {
      isPending: false,
      isError: false,
      data: { currentVersion: null },
    };
    view.rerender(
      <CurrentVersionCard supplierId={IMPORT_API_FIXTURE.supplier.id} />,
    );
    expect(screen.getByText(/قیمت جاری وجود ندارد/)).toBeInTheDocument();

    mocks.current = {
      isPending: false,
      isError: true,
      error: { message: "خطای موقت" },
      refetch: vi.fn(),
    };
    view.rerender(
      <CurrentVersionCard supplierId={IMPORT_API_FIXTURE.supplier.id} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("خطای موقت");
  });
});
