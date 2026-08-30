import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicAuthGate } from "@/features/auth";

import { AUTH_ACCOUNT_FIXTURE } from "../../../fixtures/auth";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  query: {} as Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/services/auth", () => ({
  useCurrentAccountQuery: () => mocks.query,
}));

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.query = { isPending: false, data: null };
});

describe("PublicAuthGate", () => {
  it("shows a safe bootstrap state while the session is loading", () => {
    mocks.query = { isPending: true, data: undefined };

    render(
      <PublicAuthGate>
        <div data-testid="public-content" />
      </PublicAuthGate>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("بررسی نشست امن");
    expect(screen.queryByTestId("public-content")).not.toBeInTheDocument();
  });

  it("renders public content for an unauthenticated visitor", () => {
    render(
      <PublicAuthGate>
        <div data-testid="public-content" />
      </PublicAuthGate>,
    );

    expect(screen.getByTestId("public-content")).toBeInTheDocument();
  });

  it("redirects an authenticated visitor to the fixed dashboard", async () => {
    mocks.query = { isPending: false, data: AUTH_ACCOUNT_FIXTURE };

    render(
      <PublicAuthGate>
        <div data-testid="public-content" />
      </PublicAuthGate>,
    );

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByTestId("public-content")).not.toBeInTheDocument();
  });
});
