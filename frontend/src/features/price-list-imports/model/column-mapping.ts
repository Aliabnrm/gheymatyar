import {
  CanonicalFieldSchema,
  ColumnMappingInputSchema,
  REQUIRED_MAPPING_FIELDS,
  type ColumnMapping,
  type MappingReview,
  type CanonicalField,
} from "@/services/price-list-imports/column-mapping.schema";
import type { PriceListImportStatus } from "@/services/price-list-imports/price-list-imports.schema";

export const fieldLabels: Record<CanonicalField, string> = {
  product_code: "کد کالا",
  product_name: "نام کالا",
  brand: "برند",
  unit: "واحد فروش",
  pack_size: "تعداد در بسته",
  price_irr: "قیمت ریالی",
  availability: "موجودی",
  notes: "توضیحات",
};
export const mappingFields = CanonicalFieldSchema.options.map((field) => ({
  field,
  label: fieldLabels[field],
  required: REQUIRED_MAPPING_FIELDS.includes(field),
}));
export function mappingValidation(mapping: ColumnMapping): string[] {
  const result = ColumnMappingInputSchema.safeParse(mapping);
  return result.success ? [] : [...new Set(result.error.issues.map((issue) => issue.message))];
}
export function updateColumn(
  mapping: ColumnMapping,
  field: CanonicalField,
  value: string,
): ColumnMapping {
  const columns = { ...mapping.columns };
  if (value) columns[field] = Number(value);
  else delete columns[field];
  return { ...mapping, columns };
}
export function initialMapping(review: MappingReview): ColumnMapping {
  return review.inspection.used_mapping ?? review.inspection.detected_mapping;
}
export function canSaveTemplate(
  review: MappingReview,
  status: PriceListImportStatus,
  changed: boolean,
): boolean {
  return (
    review.can_edit &&
    review.historical_snapshot &&
    status === "DRAFT" &&
    !!review.inspection.used_mapping &&
    !changed
  );
}
export const mappingOrigins = {
  detected: "تشخیص تازه از عنوان ستون‌ها",
  manual: "انتخاب دستی کاربر",
  template: "الگوی ذخیره‌شده تأمین‌کننده",
  proposal: "پیشنهاد تازه؛ در اجرای تاریخی استفاده نشده است",
};
