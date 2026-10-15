import { z } from "zod";

import {
  ChangeTypeSchema,
  ComparisonItemSchema,
  ComparisonSummarySchema,
} from "@/services/price-list-comparison/price-list-comparison.schema";

export const ReviewStatusSchema = z.enum([
  "READY_FOR_REVIEW",
  "APPROVED",
  "REJECTED",
]);

export const AuditActionSchema = z.enum([
  "PRICE_LIST_VERSION_APPROVED",
  "PRICE_LIST_VERSION_REJECTED",
]);

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
    availability: z.enum(["in_stock", "limited", "out_of_stock", "unknown"]),
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

const ChangeReportFields = {
  created_version: PriceListVersionSchema.nullable(),
  baseline_version: VersionBaselineSchema.nullable(),
  summary: ComparisonSummarySchema.nullable(),
  items: z.array(ComparisonItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive().max(100),
  offset: z.number().int().nonnegative(),
};

export const ImportChangeReportSchema = z
  .object({ import_id: z.uuid(), ...ChangeReportFields })
  .strict()
  .transform(({ import_id, created_version, baseline_version, ...report }) => ({
    ...report,
    importId: import_id,
    createdVersion: created_version,
    baselineVersion: baseline_version,
  }));

export const VersionChangeReportSchema = z
  .object({ version_id: z.uuid(), ...ChangeReportFields })
  .strict()
  .transform(
    ({ version_id, created_version, baseline_version, ...report }) => ({
      ...report,
      versionId: version_id,
      createdVersion: created_version,
      baselineVersion: baseline_version,
    }),
  );

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

export const ChangeReportFiltersSchema = z
  .object({
    changeType: ChangeTypeSchema.nullable().default(null),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().nonnegative().default(0),
  })
  .strict();

export const CreatePriceListVersionInputSchema = z
  .object({
    expectedPreviousVersionId: z.uuid().nullable(),
    confirmCreate: z.literal(true),
  })
  .strict();

export const ApprovalInputSchema = z
  .object({
    expectedCurrentVersionId: z.uuid().nullable(),
    confirmApproval: z.literal(true),
    decisionNote: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export const RejectionInputSchema = z
  .object({
    confirmRejection: z.literal(true),
    reason: z.string().trim().min(1, "دلیل رد را وارد کنید.").max(500),
  })
  .strict();

export const PriceListVersionReviewSchema = z
  .object({
    version_id: z.uuid(),
    status: ReviewStatusSchema,
    decided_by_user_id: z.uuid().nullable(),
    decided_by_email: z.email().nullable(),
    decided_at: z.iso.datetime({ offset: true }).nullable(),
    decision_note: z.string().nullable(),
  })
  .strict()
  .transform(
    ({
      version_id,
      decided_by_user_id,
      decided_by_email,
      decided_at,
      decision_note,
      ...review
    }) => ({
      ...review,
      versionId: version_id,
      decidedByUserId: decided_by_user_id,
      decidedByEmail: decided_by_email,
      decidedAt: decided_at,
      decisionNote: decision_note,
    }),
  );

export const ApprovalResultSchema = z
  .object({
    review: PriceListVersionReviewSchema,
    previous_current_version_id: z.uuid().nullable(),
    current_version_id: z.uuid().nullable(),
  })
  .strict()
  .transform(
    ({ previous_current_version_id, current_version_id, ...result }) => ({
      ...result,
      previousCurrentVersionId: previous_current_version_id,
      currentVersionId: current_version_id,
    }),
  );

export const CurrentPriceListVersionResponseSchema = z
  .object({ current_version: PriceListVersionSchema.nullable() })
  .strict()
  .transform(({ current_version }) => ({ currentVersion: current_version }));

export const CurrentPriceImpactBaselineStatusSchema = z.enum([
  "NO_CURRENT",
  "CURRENT_BASELINE",
]);

export const CurrentPriceImpactSchema = z
  .object({
    target_version: VersionBaselineSchema,
    baseline_status: CurrentPriceImpactBaselineStatusSchema,
    baseline_version: VersionBaselineSchema.nullable(),
    is_latest: z.boolean(),
    supplier_is_active: z.boolean(),
    summary: ComparisonSummarySchema.nullable(),
    items: z.array(ComparisonItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(100),
    offset: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((report, context) => {
    const noCurrent = report.baseline_status === "NO_CURRENT";
    if (noCurrent !== (report.baseline_version === null)) {
      context.addIssue({
        code: "custom",
        message: "وضعیت مبنای قیمت جاری ناسازگار است.",
        path: ["baseline_version"],
      });
    }
    if (noCurrent && (report.summary !== null || report.items.length > 0)) {
      context.addIssue({
        code: "custom",
        message: "گزارش بدون قیمت جاری نباید تغییر ساختگی داشته باشد.",
        path: ["summary"],
      });
    }
  })
  .transform(
    ({
      target_version,
      baseline_status,
      baseline_version,
      is_latest,
      supplier_is_active,
      ...report
    }) => ({
      ...report,
      targetVersion: target_version,
      baselineStatus: baseline_status,
      baselineVersion: baseline_version,
      isLatest: is_latest,
      supplierIsActive: supplier_is_active,
    }),
  );

export const CurrentPriceImpactFiltersSchema = ChangeReportFiltersSchema.extend(
  {
    baselineVersionId: z.uuid().nullable().default(null),
    expectNoCurrent: z.boolean().default(false),
  },
).superRefine((filters, context) => {
  if (filters.baselineVersionId && filters.expectNoCurrent) {
    context.addIssue({
      code: "custom",
      message: "شناسه مبنا و انتظار نبود قیمت جاری هم‌زمان مجاز نیستند.",
      path: ["expectNoCurrent"],
    });
  }
});

export const PriceListAuditEventSchema = z
  .object({
    id: z.uuid(),
    actor_user_id: z.uuid(),
    actor_email: z.email(),
    action: AuditActionSchema,
    entity_type: z.literal("PRICE_LIST_VERSION"),
    entity_id: z.uuid(),
    occurred_at: z.iso.datetime({ offset: true }),
    details: z.record(z.string(), z.unknown()),
  })
  .strict()
  .transform(
    ({
      actor_user_id,
      actor_email,
      entity_type,
      entity_id,
      occurred_at,
      ...event
    }) => ({
      ...event,
      actorUserId: actor_user_id,
      actorEmail: actor_email,
      entityType: entity_type,
      entityId: entity_id,
      occurredAt: occurred_at,
    }),
  );

export const PriceListAuditEventListSchema = z
  .object({
    items: z.array(PriceListAuditEventSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(100),
    offset: z.number().int().nonnegative(),
  })
  .strict();

export const AuditPaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().nonnegative().default(0),
  })
  .strict();

export type PriceListVersion = z.output<typeof PriceListVersionSchema>;
export type PriceListVersionList = z.output<typeof PriceListVersionListSchema>;
export type PriceListVersionItem = z.output<typeof PriceListVersionItemSchema>;
export type PriceListVersionItemList = z.output<
  typeof PriceListVersionItemListSchema
>;
export type ImportChangeReport = z.output<typeof ImportChangeReportSchema>;
export type VersionChangeReport = z.output<typeof VersionChangeReportSchema>;
export type VersionListPagination = z.input<typeof VersionListPaginationSchema>;
export type VersionItemPagination = z.input<typeof VersionItemPaginationSchema>;
export type ChangeReportFilters = z.input<typeof ChangeReportFiltersSchema>;
export type CreatePriceListVersionInput = z.input<
  typeof CreatePriceListVersionInputSchema
>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type ApprovalInput = z.input<typeof ApprovalInputSchema>;
export type RejectionInput = z.input<typeof RejectionInputSchema>;
export type ApprovalResult = z.output<typeof ApprovalResultSchema>;
export type CurrentPriceListVersionResponse = z.output<
  typeof CurrentPriceListVersionResponseSchema
>;
export type CurrentPriceImpact = z.output<typeof CurrentPriceImpactSchema>;
export type CurrentPriceImpactFilters = z.input<
  typeof CurrentPriceImpactFiltersSchema
>;
export type PriceListAuditEvent = z.output<typeof PriceListAuditEventSchema>;
export type PriceListAuditEventList = z.output<
  typeof PriceListAuditEventListSchema
>;
export type AuditPagination = z.input<typeof AuditPaginationSchema>;
