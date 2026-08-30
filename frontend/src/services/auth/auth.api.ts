import { z } from "zod";

import { apiRequest } from "@/core/api/api-client";

import {
  AuthContextSchema,
  LoginInputSchema,
  RegisterInputSchema,
  type AuthContext,
  type LoginInput,
  type RegisterInput,
} from "./auth.schema";

const AUTH_PATH = "/api/v1/auth" as const;

export function getCurrentAccountApi(
  signal?: AbortSignal,
): Promise<AuthContext> {
  return apiRequest({
    path: `${AUTH_PATH}/me`,
    signal,
    responseSchema: AuthContextSchema,
  });
}

export function loginApi(input: LoginInput): Promise<AuthContext> {
  const credentials = LoginInputSchema.parse(input);
  return apiRequest({
    path: `${AUTH_PATH}/login`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    responseSchema: AuthContextSchema,
  });
}

export function registerApi(input: RegisterInput): Promise<AuthContext> {
  const registration = RegisterInputSchema.parse(input);
  return apiRequest({
    path: `${AUTH_PATH}/register`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: registration.email,
      password: registration.password,
      organization_name: registration.organizationName,
    }),
    responseSchema: AuthContextSchema,
  });
}

export function logoutApi(): Promise<null> {
  return apiRequest({
    path: `${AUTH_PATH}/logout`,
    method: "POST",
    includeCsrfToken: true,
    responseSchema: z.null(),
  });
}
