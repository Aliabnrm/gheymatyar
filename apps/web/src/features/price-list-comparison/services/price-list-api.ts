import { publicEnv } from "@/config/public-env";

import type { ComparisonResponse } from "../model/types";
import {
  parseApiErrorResponse,
  parseComparisonResponse,
} from "./response-parser";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function comparePriceLists(
  oldFile: File,
  newFile: File,
  signal?: AbortSignal,
): Promise<ComparisonResponse> {
  const body = new FormData();
  body.append("old_file", oldFile);
  body.append("new_file", newFile);

  let response: Response;
  try {
    response = await fetch(
      publicEnv.apiBaseUrl + "/api/v1/price-lists/compare",
      { method: "POST", body, signal },
    );
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiRequestError(
      "ارتباط با سرویس مقایسه برقرار نشد. از اجرای بک‌اند مطمئن شوید.",
      "NETWORK_ERROR",
      0,
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError = parseApiErrorResponse(payload);
    if (apiError) {
      throw new ApiRequestError(
        apiError.error.message,
        apiError.error.code,
        response.status,
      );
    }
    throw new ApiRequestError(
      "پردازش فایل‌ها با خطای غیرمنتظره روبه‌رو شد.",
      "UNKNOWN_API_ERROR",
      response.status,
    );
  }

  const result = parseComparisonResponse(payload);
  if (!result) {
    throw new ApiRequestError(
      "پاسخ سرویس قابل خواندن نیست.",
      "INVALID_API_RESPONSE",
      response.status,
    );
  }

  return result;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
