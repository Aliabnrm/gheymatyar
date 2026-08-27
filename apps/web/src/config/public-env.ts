const DEFAULT_API_BASE_URL = "http://localhost:8000";

function normalizeBaseUrl(value: string | undefined): string {
  return (value || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export const publicEnv = Object.freeze({
  apiBaseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
});
