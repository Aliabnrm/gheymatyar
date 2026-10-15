import { z } from "zod";
import { MappingSnapshotSchema } from "./column-mapping.schema";
import { AvailabilitySchema } from "@/services/price-list-shared/price-list-change.schema";

export const PRICE_LIST_IMPORT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const PriceListImportStatusSchema = z.enum(["DRAFT", "FAILED"]);
export const PriceListImportStatusFilterSchema = z.enum(["draft", "failed", "all"]);

const SupplierSummarySchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(2).max(120),
  })
  .strict();

const SourceDocumentSchema = z
  .object({
    id: z.uuid(),
    original_filename: z.string().min(1),
    media_type: z.string().min(1),
    size_bytes: z.number().int().positive(),
    sha256_hex: z.string().regex(/^[a-f0-9]{64}$/),
    created_at: z.iso.datetime({ offset: true }),
  })
  .strict()
  .transform(
    ({ original_filename, media_type, size_bytes, sha256_hex, created_at, ...document }) => ({
      ...document,
      originalFilename: original_filename,
      mediaType: media_type,
      sizeBytes: size_bytes,
      sha256Hex: sha256_hex,
      createdAt: created_at,
    }),
  );

const BlockingImportErrorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()),
  })
  .strict();

export const PriceListImportSchema = z
  .object({
    id: z.uuid(),
    supplier: SupplierSummarySchema,
    source_document: SourceDocumentSchema,
    status: PriceListImportStatusSchema,
    row_count: z.number().int().nonnegative(),
    blocking_error: BlockingImportErrorSchema.nullable(),
    created_at: z.iso.datetime({ offset: true }),
    completed_at: z.iso.datetime({ offset: true }),
    parent_import_id: z.uuid().nullable().default(null),
    mapping_snapshot: MappingSnapshotSchema.nullable().default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "DRAFT" && (value.row_count < 1 || value.blocking_error)) {
      context.addIssue({
        code: "custom",
        message: "پاسخ پیش‌نویس Import ناسازگار است.",
      });
    }
    if (value.status === "FAILED" && (value.row_count !== 0 || !value.blocking_error)) {
      context.addIssue({
        code: "custom",
        message: "پاسخ Import ناموفق ناسازگار است.",
      });
    }
  })
  .transform(
    ({
      source_document,
      row_count,
      blocking_error,
      created_at,
      completed_at,
      parent_import_id,
      mapping_snapshot,
      ...priceListImport
    }) => ({
      ...priceListImport,
      sourceDocument: source_document,
      rowCount: row_count,
      blockingError: blocking_error,
      createdAt: created_at,
      completedAt: completed_at,
      parentImportId: parent_import_id,
      mappingSnapshot: mapping_snapshot,
    }),
  );

export const PriceListImportListSchema = z
  .object({
    items: z.array(PriceListImportSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(100),
    offset: z.number().int().nonnegative(),
  })
  .strict();

export const ExtractedRowSchema = z
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
    raw_row: z.record(z.string(), z.unknown()),
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
      raw_row,
      created_at,
      ...row
    }) => ({
      ...row,
      sourceRowNumber: source_row_number,
      productCodeRaw: product_code_raw,
      productCodeNormalized: product_code_normalized,
      productNameRaw: product_name_raw,
      productNameNormalized: product_name_normalized,
      packSize: pack_size,
      priceIrr: price_irr,
      availabilityRaw: availability_raw,
      rawRow: raw_row,
      createdAt: created_at,
    }),
  );

export const ExtractedRowListSchema = z
  .object({
    items: z.array(ExtractedRowSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(100),
    offset: z.number().int().nonnegative(),
  })
  .strict();

export const PriceListImportListFiltersSchema = z
  .object({
    status: PriceListImportStatusFilterSchema.default("all"),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().nonnegative().default(0),
  })
  .strict();

export const ExtractedRowPaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().nonnegative().default(0),
  })
  .strict();

export const PriceListImportUploadInputSchema = z
  .object({
    file: z
      .custom<File>((value) => value instanceof File, {
        error: "یک فایل XLSX انتخاب کنید.",
      })
      .refine((file) => file.name.toLocaleLowerCase("en-US").endsWith(".xlsx"), {
        error: "فقط فایل XLSX قابل بارگذاری است.",
      })
      .refine((file) => file.size > 0, { error: "فایل انتخاب‌شده خالی است." })
      .refine((file) => file.size <= PRICE_LIST_IMPORT_MAX_FILE_SIZE_BYTES, {
        error: "حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.",
      }),
  })
  .strict();

export type PriceListImport = z.output<typeof PriceListImportSchema>;
export type PriceListImportList = z.output<typeof PriceListImportListSchema>;
export type PriceListImportStatus = z.output<typeof PriceListImportStatusSchema>;
export type PriceListImportStatusFilter = z.output<typeof PriceListImportStatusFilterSchema>;
export type PriceListImportListFilters = z.output<typeof PriceListImportListFiltersSchema>;
export type ExtractedRow = z.output<typeof ExtractedRowSchema>;
export type ExtractedRowList = z.output<typeof ExtractedRowListSchema>;
export type ExtractedRowPagination = z.output<typeof ExtractedRowPaginationSchema>;
export type PriceListImportUploadFormInput = z.input<typeof PriceListImportUploadInputSchema>;
export type PriceListImportUploadInput = z.output<typeof PriceListImportUploadInputSchema>;
