import type { ComparisonError, ComparisonResponse } from "./types";

export type ComparisonRequestState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; data: ComparisonResponse }
  | {
      status: "failure";
      error: ComparisonError;
      data?: ComparisonResponse;
    };

export type ComparisonRequestAction =
  | { type: "error-cleared" }
  | { type: "validation-failed"; error: ComparisonError }
  | { type: "request-started" }
  | { type: "request-succeeded"; data: ComparisonResponse }
  | { type: "request-failed"; error: ComparisonError };

export function comparisonRequestReducer(
  state: ComparisonRequestState,
  action: ComparisonRequestAction,
): ComparisonRequestState {
  switch (action.type) {
    case "error-cleared":
      if (state.status !== "failure") return state;
      return state.data
        ? { status: "success", data: state.data }
        : { status: "idle" };
    case "validation-failed": {
      const data = getComparisonData(state);
      return data
        ? { status: "failure", error: action.error, data }
        : { status: "failure", error: action.error };
    }
    case "request-started":
      return { status: "submitting" };
    case "request-succeeded":
      return { status: "success", data: action.data };
    case "request-failed":
      return { status: "failure", error: action.error };
  }
}

export function getComparisonData(
  state: ComparisonRequestState,
): ComparisonResponse | null {
  if (state.status === "success") return state.data;
  if (state.status === "failure") return state.data ?? null;
  return null;
}
