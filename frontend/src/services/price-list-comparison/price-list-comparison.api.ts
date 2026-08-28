import { apiRequest } from "@/core/api/api-client";

import {
  ComparePriceListsInputSchema,
  ComparisonResponseSchema,
  type ComparePriceListsInput,
  type ComparisonResponse,
} from "./price-list-comparison.schema";

const COMPARE_PRICE_LISTS_PATH = "/api/v1/price-lists/compare" as const;

export function comparePriceListsApi(
  input: ComparePriceListsInput,
  signal?: AbortSignal,
): Promise<ComparisonResponse> {
  const files = ComparePriceListsInputSchema.parse(input);
  const body = new FormData();
  body.append("old_file", files.oldFile);
  body.append("new_file", files.newFile);

  return apiRequest({
    path: COMPARE_PRICE_LISTS_PATH,
    method: "POST",
    body,
    signal,
    responseSchema: ComparisonResponseSchema,
    errorMessages: {
      network: "ارتباط با سرویس مقایسه برقرار نشد. از اجرای بک‌اند مطمئن شوید.",
      unknown: "پردازش فایل‌ها با خطای غیرمنتظره روبه‌رو شد.",
    },
  });
}
