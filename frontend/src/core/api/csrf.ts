const CSRF_COOKIE_NAME = "gheymatyar_csrf";

export function readCsrfCookie(cookieSource?: string): string | null {
  const source =
    cookieSource ?? (typeof document === "undefined" ? "" : document.cookie);
  for (const part of source.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== CSRF_COOKIE_NAME) continue;
    const value = rawValue.join("=");
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
}

export function withCsrfHeader(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  const csrfToken = readCsrfCookie();
  if (csrfToken) result.set("X-CSRF-Token", csrfToken);
  return result;
}
