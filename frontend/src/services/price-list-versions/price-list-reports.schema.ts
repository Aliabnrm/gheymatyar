import { z } from "zod";
import {
  ChangeTypeSchema,
  ComparisonItemSchema,
  ComparisonSummarySchema,
} from "@/services/price-list-shared/price-list-change.schema";
import { PriceListVersionSchema, VersionBaselineSchema } from "./price-list-version.schema";
const ChangeReportFields = {
  created_version: PriceListVersionSchema.nullable(),
  items: z.array(ComparisonItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive().max(100),
  offset: z.number().int().nonnegative(),
};

const WithBaselineFields = {
  baseline_version: VersionBaselineSchema,
  summary: ComparisonSummarySchema,
};
const WithoutBaselineFields = {
  baseline_version: z.null(),
  summary: z.null(),
  items: z.array(ComparisonItemSchema).length(0),
  total: z.literal(0),
};
export const ImportChangeReportSchema = z
  .union([
    z
      .object({
        import_id: z.uuid(),
        ...ChangeReportFields,
        ...WithBaselineFields,
      })
      .strict(),
    z
      .object({
        import_id: z.uuid(),
        ...ChangeReportFields,
        ...WithoutBaselineFields,
      })
      .strict(),
  ])
  .transform(({ import_id, created_version, baseline_version, ...report }) => ({
    ...report,
    importId: import_id,
    createdVersion: created_version,
    baselineVersion: baseline_version,
  }));
export const VersionChangeReportSchema = z
  .union([
    z
      .object({
        version_id: z.uuid(),
        ...ChangeReportFields,
        ...WithBaselineFields,
      })
      .strict(),
    z
      .object({
        version_id: z.uuid(),
        ...ChangeReportFields,
        ...WithoutBaselineFields,
      })
      .strict(),
  ])
  .transform(({ version_id, created_version, baseline_version, ...report }) => ({
    ...report,
    versionId: version_id,
    createdVersion: created_version,
    baselineVersion: baseline_version,
  }));
export const ChangeReportFiltersSchema = z
  .object({
    changeType: ChangeTypeSchema.nullable().default(null),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().nonnegative().default(0),
  })
  .strict();

export const CurrentPriceImpactBaselineStatusSchema = z.enum(["NO_CURRENT", "CURRENT_BASELINE"]);

const ImpactFields = {
  target_version: VersionBaselineSchema,
  is_latest: z.boolean(),
  supplier_is_active: z.boolean(),
  limit: z.number().int().positive().max(100),
  offset: z.number().int().nonnegative(),
};
export const CurrentPriceImpactSchema = z
  .discriminatedUnion("baseline_status", [
    z
      .object({
        ...ImpactFields,
        baseline_status: z.literal("NO_CURRENT"),
        baseline_version: z.null(),
        summary: z.null(),
        items: z.array(ComparisonItemSchema).length(0),
        total: z.literal(0),
      })
      .strict(),
    z
      .object({
        ...ImpactFields,
        baseline_status: z.literal("CURRENT_BASELINE"),
        baseline_version: VersionBaselineSchema,
        summary: ComparisonSummarySchema,
        items: z.array(ComparisonItemSchema),
        total: z.number().int().nonnegative(),
      })
      .strict(),
  ])
  .transform((report) => {
    const common = {
      targetVersion: report.target_version,
      isLatest: report.is_latest,
      supplierIsActive: report.supplier_is_active,
      items: report.items,
      total: report.total,
      limit: report.limit,
      offset: report.offset,
    };
    if (report.baseline_status === "NO_CURRENT") {
      return {
        ...common,
        baselineStatus: report.baseline_status,
        baselineVersion: null,
        summary: null,
      };
    }
    return {
      ...common,
      baselineStatus: report.baseline_status,
      baselineVersion: report.baseline_version,
      summary: report.summary,
    };
  });

export const CurrentPriceImpactFiltersSchema = ChangeReportFiltersSchema.extend({
  baselineVersionId: z.uuid().nullable().default(null),
  expectNoCurrent: z.boolean().default(false),
}).superRefine((filters, context) => {
  if (filters.baselineVersionId && filters.expectNoCurrent) {
    context.addIssue({
      code: "custom",
      message: "شناسه مبنا و انتظار نبود قیمت جاری هم‌زمان مجاز نیستند.",
      path: ["expectNoCurrent"],
    });
  }
});

export type ImportChangeReport = z.output<typeof ImportChangeReportSchema>;
export type VersionChangeReport = z.output<typeof VersionChangeReportSchema>;
export type ChangeReportFilters = z.input<typeof ChangeReportFiltersSchema>;
export type CurrentPriceImpact = z.output<typeof CurrentPriceImpactSchema>;
export type CurrentPriceImpactFilters = z.input<typeof CurrentPriceImpactFiltersSchema>;
