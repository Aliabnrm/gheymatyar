import { afterEach, describe, expect, it, vi } from "vitest";

import { loginApi, logoutApi, registerApi } from "@/services/auth/auth.api";

import { AUTH_ACCOUNT_FIXTURE } from "../../../fixtures/auth";

afterEach(() => vi.unstubAllGlobals());

describe("auth API", () => {
  it("maps frontend registration fields to the backend contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(AUTH_ACCOUNT_FIXTURE), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await registerApi({
      organizationName: "شرکت نمونه",
      email: "owner@example.com",
      password: "a-secure-password",
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      organization_name: "شرکت نمونه",
      email: "owner@example.com",
      password: "a-secure-password",
    });
    expect(request.credentials).toBe("include");
  });

  it("does not add CSRF to login and does add it to logout", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(AUTH_ACCOUNT_FIXTURE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("document", { cookie: "gheymatyar_csrf=csrf-token" });

    await loginApi({
      email: "owner@example.com",
      password: "a-secure-password",
    });
    await logoutApi();

    const loginHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    const logoutHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(loginHeaders.has("X-CSRF-Token")).toBe(false);
    expect(logoutHeaders.get("X-CSRF-Token")).toBe("csrf-token");
  });
});
