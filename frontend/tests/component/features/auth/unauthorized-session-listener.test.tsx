import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_UNAUTHORIZED_EVENT } from "@/core/api/auth-session-event";
import { UnauthorizedSessionListener } from "@/features/auth";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  replace: vi.fn(),
  clearAuthenticatedData: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/services/auth", () => ({
  clearAuthenticatedData: mocks.clearAuthenticatedData,
}));

beforeEach(() => {
  mocks.pathname = "/";
  mocks.replace.mockReset();
  mocks.clearAuthenticatedData.mockReset();
});

function renderListener() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <UnauthorizedSessionListener />
    </QueryClientProvider>,
  );
}

describe("UnauthorizedSessionListener", () => {
  it("clears authenticated data and redirects the dashboard on 401", async () => {
    renderListener();

    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));

    await waitFor(() =>
      expect(mocks.clearAuthenticatedData).toHaveBeenCalled(),
    );
    expect(mocks.replace).toHaveBeenCalledWith("/login?reason=session-expired");
  });

  it("removes its browser listener when unmounted", () => {
    const view = renderListener();
    view.unmount();

    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));

    expect(mocks.clearAuthenticatedData).not.toHaveBeenCalled();
  });
});
