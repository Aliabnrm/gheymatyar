import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/features/auth";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  state: { isPending: false, error: null as Error | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/services/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/auth")>();
  return {
    ...actual,
    useLoginMutation: () => ({
      ...mocks.state,
      mutateAsync: mocks.mutateAsync,
      reset: mocks.reset,
    }),
  };
});

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.mutateAsync.mockReset();
  mocks.reset.mockReset();
  mocks.state.isPending = false;
  mocks.state.error = null;
});

describe("LoginForm", () => {
  it("validates locally and never submits invalid fields", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: "ورود امن" }));

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText("ایمیل معتبر وارد کنید.")).toBeInTheDocument();
  });

  it("submits a valid login and navigates only to the fixed dashboard path", async () => {
    const user = userEvent.setup();
    mocks.mutateAsync.mockResolvedValue(undefined);
    render(<LoginForm />);

    await user.type(screen.getByLabelText("ایمیل"), " owner@example.com ");
    await user.type(screen.getByLabelText("رمز عبور"), "a-secure-password");
    await user.click(screen.getByRole("button", { name: "ورود امن" }));

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "a-secure-password",
    });
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
  });

  it("disables controls while the login is running", () => {
    mocks.state.isPending = true;
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "در حال ورود…" })).toBeDisabled();
    expect(screen.getByLabelText("ایمیل")).toBeDisabled();
    expect(screen.getByLabelText("رمز عبور")).toBeDisabled();
  });

  it.each([
    "ایمیل یا رمز عبور صحیح نیست.",
    "تعداد تلاش‌های ورود بیش از حد مجاز است.",
    "ارتباط با سرویس برقرار نشد.",
  ])("shows an accessible server error: %s", async (message) => {
    mocks.state.error = new Error(message);
    render(<LoginForm />);

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
  });
});
