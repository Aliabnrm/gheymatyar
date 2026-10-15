import { z } from "zod";
import {
  ComparisonItemSchema,
  ComparisonSummarySchema,
} from "@/services/price-list-shared/price-list-change.schema";
export * from "@/services/price-list-shared/price-list-change.schema";
export const ComparePriceListsInputSchema = z.object({
  oldFile: z.file(),
  newFile: z.file(),
});
export const ComparisonResponseSchema = z.object({
  api_version: z.literal("1"),
  currency: z.literal("IRR"),
  summary: ComparisonSummarySchema,
  items: z.array(ComparisonItemSchema),
});
export type ComparePriceListsInput = z.infer<typeof ComparePriceListsInputSchema>;
export type ComparisonResponse = z.infer<typeof ComparisonResponseSchema>;
