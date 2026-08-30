export const AUTH_UNAUTHORIZED_EVENT = "gheymatyar:auth-unauthorized" as const;

export interface AuthUnauthorizedEventDetail {
  code: string;
}

export function dispatchAuthUnauthorized(code: string): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<AuthUnauthorizedEventDetail>(AUTH_UNAUTHORIZED_EVENT, {
      detail: { code },
    }),
  );
}
