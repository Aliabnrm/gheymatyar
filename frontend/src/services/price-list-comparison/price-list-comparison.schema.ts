import { z } from "zod";

export const CHANGE_TYPES = [
  "ADDED",
  "REMOVED",
  "PRICE_CHANGED",
  "PACK_SIZE_CHANGED",
  "UNIT_CHANGED",
  "NAME_CHANGED",
  "BRAND_CHANGED",
  "AVAILABILITY_CHANGED",
  "NOTES_CHANGED",
  "UNCHANGED",
] as const;

export const AVAILABILITIES = [
  "in_stock",
  "limited",
  "out_of_stock",
  "unknown",
] as const;

export const ChangeTypeSchema = z.enum(CHANGE_TYPES);
export const AvailabilitySchema = z.enum(AVAILABILITIES);

const nullableStringSchema = z.string().nullable();
const nullableIntegerSchema = z.number().int().nullable();

export const ComparePriceListsInputSchema = z.object({
  oldFile: z.file(),
  newFile: z.file(),
});

export const PriceListItemSchema = z.object({
  source_row_number: z.number().int().positive(),
  product_code_raw: z.string(),
  product_code_normalized: z.string(),
  product_name_raw: z.string(),
  brand: nullableStringSchema,
  unit: nullableStringSchema,
  pack_size: nullableIntegerSchema,
  price_irr: z.number().int().positive(),
  availability: AvailabilitySchema,
  availability_raw: nullableStringSchema,
  notes: nullableStringSchema,
  raw_row: z.record(z.string(), z.unknown()),
});

export const FieldChangeSchema = z.object({
  field: z.string(),
  previous: z.union([z.string(), z.number().int()]).nullable(),
  current: z.union([z.string(), z.number().int()]).nullable(),
});

export const ComparisonItemSchema = z
  .object({
    product_code: z.string(),
    change_types: z.array(ChangeTypeSchema).min(1),
    previous: PriceListItemSchema.nullable(),
    current: PriceListItemSchema.nullable(),
    field_changes: z.array(FieldChangeSchema),
    price_delta_irr: nullableIntegerSchema,
    price_change_percent: nullableStringSchema,
    is_high_risk: z.boolean(),
  })
  .refine((item) => item.previous !== null || item.current !== null, {
    message: "حداقل یکی از نسخه‌های قبلی یا فعلی باید وجود داشته باشد.",
  });

export const ComparisonSummarySchema = z.object({
  old_items: z.number().int().nonnegative(),
  new_items: z.number().int().nonnegative(),
  added: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
  price_changed: z.number().int().nonnegative(),
  price_increased: z.number().int().nonnegative(),
  price_decreased: z.number().int().nonnegative(),
  metadata_only_changed: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  high_risk: z.number().int().nonnegative(),
});

export const ComparisonResponseSchema = z.object({
  api_version: z.literal("1"),
  currency: z.literal("IRR"),
  summary: ComparisonSummarySchema,
  items: z.array(ComparisonItemSchema),
});

export type ComparePriceListsInput = z.infer<
  typeof ComparePriceListsInputSchema
>;
export type ChangeType = z.infer<typeof ChangeTypeSchema>;
export type Availability = z.infer<typeof AvailabilitySchema>;
export type PriceListItem = z.infer<typeof PriceListItemSchema>;
export type FieldChange = z.infer<typeof FieldChangeSchema>;
export type ComparisonItem = z.infer<typeof ComparisonItemSchema>;
export type ComparisonSummary = z.infer<typeof ComparisonSummarySchema>;
export type ComparisonResponse = z.infer<typeof ComparisonResponseSchema>;
