import type { ZodType } from "zod";

import { publicEnv } from "@/config/public-env";

import { ApiRequestError, isAbortError } from "./api-error";
import { ApiErrorPayloadSchema } from "./api-error.schema";
import { dispatchAuthUnauthorized } from "./auth-session-event";
import { withCsrfHeader } from "./csrf";

const NETWORK_ERROR_MESSAGE =
  "ارتباط با سرویس برقرار نشد. از اجرای بک‌اند مطمئن شوید.";
const UNKNOWN_API_ERROR_MESSAGE =
  "پردازش درخواست با خطای غیرمنتظره روبه‌رو شد.";
const INVALID_API_RESPONSE_MESSAGE = "پاسخ سرویس قابل خواندن نیست.";

interface ApiRequestOptions<TResponse> {
  path: `/${string}`;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | null;
  headers?: HeadersInit;
  signal?: AbortSignal;
  responseSchema: ZodType<TResponse>;
  errorMessages?: Partial<ApiErrorMessages>;
  includeCsrfToken?: boolean;
}

interface ApiErrorMessages {
  network: string;
  unknown: string;
  invalidResponse: string;
}

const defaultErrorMessages: ApiErrorMessages = {
  network: NETWORK_ERROR_MESSAGE,
  unknown: UNKNOWN_API_ERROR_MESSAGE,
  invalidResponse: INVALID_API_RESPONSE_MESSAGE,
};

export async function apiRequest<TResponse>({
  path,
  method = "GET",
  body,
  headers,
  signal,
  responseSchema,
  errorMessages,
  includeCsrfToken = false,
}: ApiRequestOptions<TResponse>): Promise<TResponse> {
  const messages = { ...defaultErrorMessages, ...errorMessages };
  const response = await sendRequest(
    path,
    {
      method,
      body,
      credentials: "include",
      headers:
        includeCsrfToken && method !== "GET"
          ? withCsrfHeader(headers)
          : headers,
      signal,
    },
    messages.network,
  );
  const payload = await readJson(response);

  if (!response.ok) {
    const errorResult = ApiErrorPayloadSchema.safeParse(payload);
    if (errorResult.success) {
      if (response.status === 401) {
        dispatchAuthUnauthorized(errorResult.data.error.code);
      }
      throw new ApiRequestError(errorResult.data.error.message, {
        code: errorResult.data.error.code,
        status: response.status,
      });
    }

    throw new ApiRequestError(messages.unknown, {
      code: "UNKNOWN_API_ERROR",
      status: response.status,
    });
  }

  const responseResult = responseSchema.safeParse(payload);
  if (!responseResult.success) {
    throw new ApiRequestError(messages.invalidResponse, {
      code: "INVALID_API_RESPONSE",
      status: response.status,
    });
  }

  return responseResult.data;
}

async function sendRequest(
  path: `/${string}`,
  init: RequestInit,
  networkErrorMessage: string,
): Promise<Response> {
  try {
    return await fetch(`${publicEnv.apiBaseUrl}${path}`, init);
  } catch (error) {
    if (isAbortError(error)) throw error;

    throw new ApiRequestError(networkErrorMessage, {
      code: "NETWORK_ERROR",
      status: 0,
      cause: error,
    });
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
