import { z } from "zod";

export const CanonicalFieldSchema = z.enum([
  "product_code",
  "product_name",
  "brand",
  "unit",
  "pack_size",
  "price_irr",
  "availability",
  "notes",
]);
export type CanonicalField = z.output<typeof CanonicalFieldSchema>;
export const ColumnMappingSchema = z
  .object({
    sheet_name: z.string().min(1).max(31),
    header_row: z.number().int().min(1).max(50020),
    columns: z.partialRecord(CanonicalFieldSchema, z.number().int().min(1).max(200)),
  })
  .strict();
export const REQUIRED_MAPPING_FIELDS: CanonicalField[] = [
  "product_code",
  "product_name",
  "price_irr",
];
export const ColumnMappingInputSchema = ColumnMappingSchema.superRefine((value, context) => {
  for (const field of REQUIRED_MAPPING_FIELDS) {
    if (!value.columns[field])
      context.addIssue({
        code: "custom",
        path: ["columns", field],
        message: "انتخاب این ستون الزامی است.",
      });
  }
  const positions = Object.values(value.columns);
  if (new Set(positions).size !== positions.length)
    context.addIssue({
      code: "custom",
      path: ["columns"],
      message: "هر ستون را فقط برای یک فیلد انتخاب کنید.",
    });
});
export type ColumnMapping = z.output<typeof ColumnMappingSchema>;
export const MappingSnapshotSchema = z
  .object({
    sheets: z.array(z.string()),
    detected_mapping: ColumnMappingSchema,
    used_mapping: ColumnMappingSchema.nullable(),
    origin: z.enum(["detected", "manual", "template", "proposal"]),
    template_id: z.uuid().nullable(),
    columns: z.array(
      z
        .object({
          index: z.number().int().positive(),
          label: z.string().max(200),
        })
        .strict(),
    ),
    ambiguous_fields: z.partialRecord(CanonicalFieldSchema, z.array(z.number().int().positive())),
    preview: z
      .array(
        z
          .object({
            source_row_number: z.number().int().positive(),
            values: z.array(z.string().max(200)),
          })
          .strict(),
      )
      .max(5),
    issues: z
      .array(
        z
          .object({
            row: z.number().int().positive().nullable(),
            field: CanonicalFieldSchema.nullable(),
            code: z.string(),
            message: z.string(),
          })
          .strict(),
      )
      .max(100),
    total_errors: z.number().int().nonnegative(),
    errors_truncated: z.boolean(),
  })
  .strict();
export const MappingTemplateSchema = z
  .object({
    id: z.uuid(),
    source_import_id: z.uuid(),
    created_at: z.iso.datetime({ offset: true }),
    mapping: ColumnMappingSchema,
  })
  .strict();
export const MappingReviewSchema = z
  .object({
    inspection: MappingSnapshotSchema,
    saved_template: MappingTemplateSchema.nullable(),
    can_edit: z.boolean(),
    historical_snapshot: z.boolean(),
  })
  .strict();
export const SaveMappingTemplateSchema = z
  .object({
    source_import_id: z.uuid(),
    expected_template_id: z.uuid().nullable().default(null),
    confirm_replace: z.boolean().default(false),
  })
  .strict();
export type MappingReview = z.output<typeof MappingReviewSchema>;
export type MappingTemplate = z.output<typeof MappingTemplateSchema>;
export type SaveMappingTemplate = z.input<typeof SaveMappingTemplateSchema>;
