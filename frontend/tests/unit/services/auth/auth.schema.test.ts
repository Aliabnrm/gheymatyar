import { describe, expect, it } from "vitest";

import {
  AuthContextSchema,
  LoginInputSchema,
  RegisterInputSchema,
} from "@/services/auth/auth.schema";

import { AUTH_ACCOUNT_FIXTURE } from "../../../fixtures/auth";

describe("auth schemas", () => {
  it("accepts only the safe account context and current roles", () => {
    expect(AuthContextSchema.parse(AUTH_ACCOUNT_FIXTURE)).toEqual(
      AUTH_ACCOUNT_FIXTURE,
    );
    expect(
      AuthContextSchema.safeParse({
        ...AUTH_ACCOUNT_FIXTURE,
        session_token: "secret",
      }).success,
    ).toBe(false);
    expect(
      AuthContextSchema.safeParse({
        ...AUTH_ACCOUNT_FIXTURE,
        membership: { role: "ADMIN" },
      }).success,
    ).toBe(false);
  });

  it("validates login and registration inputs before sending", () => {
    expect(
      LoginInputSchema.safeParse({ email: "invalid", password: "password" })
        .success,
    ).toBe(false);
    expect(
      RegisterInputSchema.safeParse({
        organizationName: "شرکت",
        email: "owner@example.com",
        password: "short",
      }).success,
    ).toBe(false);
    expect(
      RegisterInputSchema.parse({
        organizationName: "  شرکت نمونه  ",
        email: "owner@example.com",
        password: "a-secure-password",
      }).organizationName,
    ).toBe("شرکت نمونه");
    expect(
      LoginInputSchema.parse({
        email: "  owner@example.com  ",
        password: "a-secure-password",
      }).email,
    ).toBe("owner@example.com");
  });
});
