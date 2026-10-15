export const AUTH_UNAUTHORIZED_EVENT = "gheymatyar:auth-unauthorized" as const;

export interface AuthUnauthorizedEventDetail {
  code: string;
}

let sessionEpoch = 0;

export function authSessionEpoch(): number {
  return sessionEpoch;
}

export function advanceAuthSessionEpoch(): void {
  sessionEpoch += 1;
}

export function dispatchAuthUnauthorized(code: string, requestEpoch = sessionEpoch): void {
  if (requestEpoch !== sessionEpoch) return;
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<AuthUnauthorizedEventDetail>(AUTH_UNAUTHORIZED_EVENT, {
      detail: { code },
    }),
  );
}
