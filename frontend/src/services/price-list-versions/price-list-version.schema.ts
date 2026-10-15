import { z } from "zod";
import { AvailabilitySchema } from "@/services/price-list-shared/price-list-change.schema";
export const ReviewStatusSchema = z.enum(["READY_FOR_REVIEW", "APPROVED", "REJECTED"]);

export const PriceListVersionSchema = z
  .object({
    id: z.uuid(),
    supplier_id: z.uuid(),
    source_import_id: z.uuid(),
    previous_version_id: z.uuid().nullable(),
    version_number: z.number().int().positive(),
    created_by_user_id: z.uuid(),
    created_by_email: z.email(),
    row_count: z.number().int().positive(),
    created_at: z.iso.datetime({ offset: true }),
    review_status: ReviewStatusSchema,
    decided_by_user_id: z.uuid().nullable(),
    decided_by_email: z.email().nullable(),
    decided_at: z.iso.datetime({ offset: true }).nullable(),
    decision_note: z.string().nullable(),
    is_current: z.boolean(),
  })
  .strict()
  .transform(
    ({
      supplier_id,
      source_import_id,
      previous_version_id,
      version_number,
      created_by_user_id,
      created_by_email,
      row_count,
      created_at,
      review_status,
      decided_by_user_id,
      decided_by_email,
      decided_at,
      decision_note,
      is_current,
      ...version
    }) => ({
      ...version,
      supplierId: supplier_id,
      sourceImportId: source_import_id,
      previousVersionId: previous_version_id,
      versionNumber: version_number,
      createdByUserId: created_by_user_id,
      createdByEmail: created_by_email,
      rowCount: row_count,
      createdAt: created_at,
      reviewStatus: review_status,
      decidedByUserId: decided_by_user_id,
      decidedByEmail: decided_by_email,
      decidedAt: decided_at,
      decisionNote: decision_note,
      isCurrent: is_current,
    }),
  );

export const PriceListVersionListSchema = z
  .object({
    items: z.array(PriceListVersionSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(100),
    offset: z.number().int().nonnegative(),
  })
  .strict();

export const PriceListVersionItemSchema = z
  .object({
    id: z.uuid(),
    source_row_number: z.number().int().positive(),
    product_code_raw: z.string(),
    product_code_normalized: z.string().min(1),
    product_name_raw: z.string(),
    product_name_normalized: z.string().min(1),
    brand: z.string().nullable(),
    unit: z.string().nullable(),
    pack_size: z.number().int().positive().nullable(),
    price_irr: z.number().int().positive(),
    availability: AvailabilitySchema,
    availability_raw: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.iso.datetime({ offset: true }),
  })
  .strict()
  .transform(
    ({
      source_row_number,
      product_code_raw,
      product_code_normalized,
      product_name_raw,
      product_name_normalized,
      pack_size,
      price_irr,
      availability_raw,
      created_at,
      ...item
    }) => ({
      ...item,
      sourceRowNumber: source_row_number,
      productCodeRaw: product_code_raw,
      productCodeNormalized: product_code_normalized,
      productNameRaw: product_name_raw,
      productNameNormalized: product_name_normalized,
      packSize: pack_size,
      priceIrr: price_irr,
      availabilityRaw: availability_raw,
      createdAt: created_at,
    }),
  );

export const PriceListVersionItemListSchema = z
  .object({
    items: z.array(PriceListVersionItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(100),
    offset: z.number().int().nonnegative(),
  })
  .strict();

export const VersionBaselineSchema = z
  .object({
    id: z.uuid(),
    version_number: z.number().int().positive(),
    created_at: z.iso.datetime({ offset: true }),
  })
  .strict()
  .transform(({ version_number, created_at, ...baseline }) => ({
    ...baseline,
    versionNumber: version_number,
    createdAt: created_at,
  }));

export const VersionListPaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().nonnegative().default(0),
  })
  .strict();

export const VersionItemPaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().nonnegative().default(0),
  })
  .strict();

export type PriceListVersion = z.output<typeof PriceListVersionSchema>;
export type PriceListVersionList = z.output<typeof PriceListVersionListSchema>;
export type PriceListVersionItem = z.output<typeof PriceListVersionItemSchema>;
export type PriceListVersionItemList = z.output<typeof PriceListVersionItemListSchema>;
export type VersionListPagination = z.input<typeof VersionListPaginationSchema>;
export type VersionItemPagination = z.input<typeof VersionItemPaginationSchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
