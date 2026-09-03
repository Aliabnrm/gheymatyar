import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedDashboard } from "@/features/auth";

import { AUTH_ACCOUNT_FIXTURE } from "../../../fixtures/auth";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refetch: vi.fn(),
  query: {} as Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => "/",
}));

vi.mock("@/services/auth", () => ({
  useCurrentAccountQuery: () => mocks.query,
  useLogoutMutation: () => ({
    isPending: false,
    error: null,
    mutate: vi.fn(),
  }),
}));

vi.mock("@/features/price-list-comparison", () => ({
  PriceListComparisonPage: ({
    accountActions,
  }: {
    accountActions: React.ReactNode;
  }) => <div data-testid="workspace">{accountActions}</div>,
}));

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.refetch.mockReset();
  mocks.query = {
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    refetch: mocks.refetch,
  };
});

describe("ProtectedDashboard", () => {
  it("does not render the workspace before auth bootstrap finishes", () => {
    mocks.query = { ...mocks.query, isPending: true };
    render(<ProtectedDashboard />);

    expect(screen.getByRole("status")).toHaveTextContent("در حال بررسی نشست");
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated session to the fixed login path", async () => {
    mocks.query = {
      ...mocks.query,
      isError: true,
      error: { status: 401 },
    };
    render(<ProtectedDashboard />);

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/login?reason=session-expired",
      ),
    );
    expect(screen.queryByTestId("workspace")).not.toBeInTheDocument();
  });

  it("shows account context and the workspace only after authentication", () => {
    mocks.query = {
      ...mocks.query,
      isSuccess: true,
      data: AUTH_ACCOUNT_FIXTURE,
    };
    render(<ProtectedDashboard />);

    expect(screen.getByTestId("workspace")).toBeInTheDocument();
    expect(screen.getByText("شرکت نمونه")).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("مالک")).toBeInTheDocument();
  });

  it("offers a retry for a recoverable account request failure", async () => {
    const user = userEvent.setup();
    mocks.query = {
      ...mocks.query,
      isError: true,
      error: { status: 500 },
    };
    render(<ProtectedDashboard />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "دریافت اطلاعات حساب ممکن نشد",
    );
    await user.click(screen.getByRole("button", { name: "تلاش دوباره" }));

    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
