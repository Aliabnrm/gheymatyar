import { describe, expect, it } from "vitest";

import {
  parseApiErrorResponse,
  parseComparisonResponse,
} from "./response-parser";

const validSummary = {
  old_items: 0,
  new_items: 0,
  added: 0,
  removed: 0,
  price_changed: 0,
  price_increased: 0,
  price_decreased: 0,
  metadata_only_changed: 0,
  unchanged: 0,
  high_risk: 0,
};

describe("comparison API response parser", () => {
  it("accepts a valid versioned IRR response", () => {
    const payload = {
      api_version: "1",
      currency: "IRR",
      summary: validSummary,
      items: [],
    };

    expect(parseComparisonResponse(payload)).toEqual(payload);
  });

  it("rejects a response with an unexpected currency", () => {
    expect(
      parseComparisonResponse({
        api_version: "1",
        currency: "IRT",
        summary: validSummary,
        items: [],
      }),
    ).toBeNull();
  });

  it("rejects malformed nested items", () => {
    expect(
      parseComparisonResponse({
        api_version: "1",
        currency: "IRR",
        summary: validSummary,
        items: [{ product_code: "A" }],
      }),
    ).toBeNull();
  });

  it("only accepts structured API errors", () => {
    expect(
      parseApiErrorResponse({
        error: {
          code: "INVALID_PRICE",
          message: "قیمت نامعتبر است.",
          details: {},
        },
      }),
    ).toMatchObject({ error: { code: "INVALID_PRICE" } });
    expect(parseApiErrorResponse({ error: "invalid" })).toBeNull();
  });
});
