import { describe, expect, it } from "vitest";

import { readCsrfCookie } from "@/core/api/csrf";

describe("readCsrfCookie", () => {
  it("reads only the exact documented CSRF cookie", () => {
    expect(readCsrfCookie("other=1; gheymatyar_csrf=safe%2Dtoken")).toBe(
      "safe-token",
    );
    expect(readCsrfCookie("gheymatyar_csrf_suffix=unsafe")).toBeNull();
  });

  it("rejects an empty or malformed encoded value", () => {
    expect(readCsrfCookie("gheymatyar_csrf=")).toBeNull();
    expect(readCsrfCookie("gheymatyar_csrf=%E0%A4%A")).toBeNull();
  });
});
