import type { ChangeType } from "@/services/price-list-shared/price-list-change.schema";

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  ADDED: "کالای جدید",
  REMOVED: "حذف‌شده",
  PRICE_CHANGED: "تغییر قیمت",
  PACK_SIZE_CHANGED: "تغییر تعداد در بسته",
  UNIT_CHANGED: "تغییر واحد فروش",
  NAME_CHANGED: "نام کالا",
  BRAND_CHANGED: "برند",
  AVAILABILITY_CHANGED: "موجودی",
  NOTES_CHANGED: "توضیحات",
  UNCHANGED: "بدون تغییر",
};

export const CHANGE_FILTERS: ReadonlyArray<{
  value: ChangeType | null;
  label: string;
}> = [
  { value: null, label: "همه" },
  { value: "ADDED", label: "جدید" },
  { value: "REMOVED", label: "حذف‌شده" },
  { value: "PRICE_CHANGED", label: "قیمت" },
  { value: "PACK_SIZE_CHANGED", label: "بسته‌بندی" },
  { value: "UNIT_CHANGED", label: "واحد" },
];
