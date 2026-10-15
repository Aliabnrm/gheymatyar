import type { ChangeType } from "@/services/price-list-comparison/price-list-comparison.schema";
export const changeLabels: Record<ChangeType, string> = {
  ADDED: "جدید",
  REMOVED: "حذف‌شده",
  PRICE_CHANGED: "قیمت",
  PACK_SIZE_CHANGED: "تعداد بسته",
  UNIT_CHANGED: "واحد",
  NAME_CHANGED: "نام",
  BRAND_CHANGED: "برند",
  AVAILABILITY_CHANGED: "موجودی",
  NOTES_CHANGED: "توضیحات",
  UNCHANGED: "بدون تغییر",
};

export function getDeltaClassName(delta: number | null): string {
  if (delta !== null && delta < 0) return "delta-cell delta-cell--down";
  if (delta !== null && delta > 0) return "delta-cell delta-cell--up";
  return "delta-cell";
}
