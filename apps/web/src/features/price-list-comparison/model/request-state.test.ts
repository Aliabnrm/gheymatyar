import { describe, expect, it } from "vitest";

import {
  comparisonRequestReducer,
  type ComparisonRequestState,
} from "./request-state";
import type { ComparisonResponse } from "./types";

const response: ComparisonResponse = {
  api_version: "1",
  currency: "IRR",
  summary: {
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
  },
  items: [],
};

const validationError = {
  code: "INVALID_FILE_TYPE",
  message: "فایل نامعتبر است.",
};

describe("comparison request state", () => {
  it("models request lifecycle explicitly", () => {
    const loading = comparisonRequestReducer(
      { status: "idle" },
      { type: "request-started" },
    );
    expect(loading).toEqual({ status: "submitting" });

    const success = comparisonRequestReducer(loading, {
      type: "request-succeeded",
      data: response,
    });
    expect(success).toEqual({ status: "success", data: response });
  });

  it("preserves an existing result when local validation fails", () => {
    const state: ComparisonRequestState = { status: "success", data: response };
    const failed = comparisonRequestReducer(state, {
      type: "validation-failed",
      error: validationError,
    });

    expect(failed).toEqual({
      status: "failure",
      error: validationError,
      data: response,
    });
  });

  it("clears a validation error without discarding its result", () => {
    const state: ComparisonRequestState = {
      status: "failure",
      error: validationError,
      data: response,
    };

    expect(comparisonRequestReducer(state, { type: "error-cleared" })).toEqual({
      status: "success",
      data: response,
    });
  });
});
