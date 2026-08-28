import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { apiRequest } from "./api-client";

const ValueResponseSchema = z.object({ value: z.string() });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("returns a successful response only after parsing it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ value: "ok" }, 200));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest({
        path: "/test",
        responseSchema: ValueResponseSchema,
      }),
    ).resolves.toEqual({ value: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/test",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("maps the structured backend error contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "INVALID_PRICE",
              message: "قیمت نامعتبر است.",
              details: { row: 4 },
            },
          },
          422,
        ),
      ),
    );

    await expect(
      apiRequest({ path: "/test", responseSchema: ValueResponseSchema }),
    ).rejects.toMatchObject({
      name: "ApiRequestError",
      code: "INVALID_PRICE",
      message: "قیمت نامعتبر است.",
      status: 422,
    });
  });

  it("uses a stable fallback for an unstructured backend error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "invalid" }, 500)),
    );

    await expect(
      apiRequest({ path: "/test", responseSchema: ValueResponseSchema }),
    ).rejects.toMatchObject({
      code: "UNKNOWN_API_ERROR",
      status: 500,
    });
  });

  it("rejects an untrusted success payload that does not match its schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ unexpected: true }, 200)),
    );

    await expect(
      apiRequest({ path: "/test", responseSchema: ValueResponseSchema }),
    ).rejects.toMatchObject({
      code: "INVALID_API_RESPONSE",
      status: 200,
    });
  });

  it("maps a network failure without exposing its internal error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("connection refused")),
    );

    await expect(
      apiRequest({ path: "/test", responseSchema: ValueResponseSchema }),
    ).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
  });
});

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
