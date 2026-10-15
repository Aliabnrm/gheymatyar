import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SuppliersListPage } from "@/features/suppliers";

import { AUTH_ACCOUNT_FIXTURE } from "../../../fixtures/auth";
import { SUPPLIER_FIXTURE } from "../../../fixtures/suppliers";

const mocks = vi.hoisted(() => ({
  account: {} as Record<string, unknown>,
  suppliers: {} as Record<string, unknown>,
}));

vi.mock("@/services/auth", () => ({
  useCurrentAccountQuery: () => mocks.account,
}));

vi.mock("@/services/suppliers", () => ({
  useSuppliersQuery: () => mocks.suppliers,
}));

beforeEach(() => {
  mocks.account = { data: AUTH_ACCOUNT_FIXTURE };
  mocks.suppliers = {
    isPending: false,
    isError: false,
    data: { items: [], total: 0, limit: 20, offset: 0 },
  };
});

describe("SuppliersListPage", () => {
  it("keeps the previous-page action when a refreshed final page becomes empty", async () => {
    mocks.suppliers = {
      isPending: false,
      isError: false,
      data: { items: [SUPPLIER_FIXTURE], total: 21 },
    };
    const view = render(<SuppliersListPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: "صفحه بعد" }));
    mocks.suppliers = {
      isPending: false,
      isError: false,
      data: { items: [], total: 20 },
    };
    view.rerender(<SuppliersListPage />);
    expect(screen.getByRole("button", { name: "صفحه قبل" })).toBeEnabled();
    expect(screen.getByText(/به صفحه قبل برگردید/)).toBeInTheDocument();
  });
  it("shows a loading state without leaking list data", () => {
    mocks.suppliers = { isPending: true, isError: false };
    render(<SuppliersListPage />);

    expect(screen.getByRole("status")).toHaveAccessibleName("در حال دریافت تأمین‌کنندگان");
    expect(screen.queryByText(SUPPLIER_FIXTURE.name)).not.toBeInTheDocument();
  });

  it("shows owner empty state and create actions", () => {
    render(<SuppliersListPage />);

    expect(screen.getByText("تأمین‌کننده‌ای در این وضعیت وجود ندارد.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /تأمین‌کننده/ })).not.toHaveLength(0);
  });

  it("renders a supplier and hides write actions from operators", () => {
    mocks.account = {
      data: {
        ...AUTH_ACCOUNT_FIXTURE,
        membership: { role: "OPERATOR" },
      },
    };
    mocks.suppliers = {
      isPending: false,
      isError: false,
      data: { items: [SUPPLIER_FIXTURE], total: 1, limit: 20, offset: 0 },
    };
    render(<SuppliersListPage />);

    expect(screen.getByRole("link", { name: SUPPLIER_FIXTURE.name })).toBeInTheDocument();
    expect(screen.getAllByText("فعال")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "تأمین‌کننده جدید" })).not.toBeInTheDocument();
  });
});
