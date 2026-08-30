import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountMenu } from "@/features/auth/components/account-menu";

import { AUTH_ACCOUNT_FIXTURE } from "../../../fixtures/auth";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  mutate: vi.fn(),
  state: { isPending: false, error: null as Error | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/services/auth", () => ({
  useLogoutMutation: () => ({
    ...mocks.state,
    mutate: mocks.mutate,
  }),
}));

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.mutate.mockReset();
  mocks.state.isPending = false;
  mocks.state.error = null;
});

describe("AccountMenu", () => {
  it("shows the current organization, role and email", () => {
    render(<AccountMenu account={AUTH_ACCOUNT_FIXTURE} />);

    expect(screen.getByText("شرکت نمونه")).toBeInTheDocument();
    expect(screen.getByText("مالک")).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
  });

  it("redirects to the fixed login notice after a successful logout", async () => {
    const user = userEvent.setup();
    mocks.mutate.mockImplementation((_input, options) => options.onSuccess());
    render(<AccountMenu account={AUTH_ACCOUNT_FIXTURE} />);

    await user.click(screen.getByRole("button", { name: "خروج" }));

    expect(mocks.replace).toHaveBeenCalledWith("/login?reason=logged-out");
  });

  it("keeps logout recoverable when the request fails", () => {
    mocks.state.error = new Error("خروج انجام نشد. دوباره تلاش کنید.");
    render(<AccountMenu account={AUTH_ACCOUNT_FIXTURE} />);

    expect(screen.getByRole("alert")).toHaveTextContent("خروج انجام نشد");
    expect(screen.getByRole("button", { name: "خروج" })).toBeEnabled();
  });

  it("disables logout while the request is pending", () => {
    mocks.state.isPending = true;
    render(<AccountMenu account={AUTH_ACCOUNT_FIXTURE} />);

    expect(screen.getByRole("button", { name: "در حال خروج…" })).toBeDisabled();
  });
});
