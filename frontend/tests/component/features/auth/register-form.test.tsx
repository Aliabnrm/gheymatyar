import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterForm } from "@/features/auth";

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
    useRegisterMutation: () => ({
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

describe("RegisterForm", () => {
  it("rejects a short password before the network request", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText("نام سازمان"), "شرکت نمونه");
    await user.type(screen.getByLabelText("ایمیل مالک"), "owner@example.com");
    await user.type(screen.getByLabelText("رمز عبور"), "short");
    await user.click(
      screen.getByRole("button", { name: "ساخت حساب و سازمان" }),
    );

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/حداقل ۱۲ نویسه/)).toBeInTheDocument();
  });

  it("submits registration and redirects after success", async () => {
    const user = userEvent.setup();
    mocks.mutateAsync.mockResolvedValue(undefined);
    render(<RegisterForm />);
    await user.type(screen.getByLabelText("نام سازمان"), "  شرکت نمونه  ");
    await user.type(screen.getByLabelText("ایمیل مالک"), "owner@example.com");
    await user.type(screen.getByLabelText("رمز عبور"), "a-secure-password");
    await user.click(
      screen.getByRole("button", { name: "ساخت حساب و سازمان" }),
    );

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      organizationName: "شرکت نمونه",
      email: "owner@example.com",
      password: "a-secure-password",
    });
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
  });

  it.each([
    "برای این ایمیل قبلاً حسابی ثبت شده است.",
    "ثبت‌نام عمومی در این محیط فعال نیست.",
    "خطای داخلی پیش‌بینی‌نشده‌ای رخ داد.",
  ])("shows a stable registration error: %s", async (message) => {
    mocks.state.error = new Error(message);
    render(<RegisterForm />);
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
  });
});
