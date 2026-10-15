import type {
  ComparisonItem,
  PriceListItem,
} from "@/services/price-list-shared/price-list-change.schema";
import { formatInteger } from "@/utils/format";

const METADATA_LABELS: Readonly<Record<string, string>> = {
  product_name_raw: "نام کالا",
  product_name: "نام کالا",
  brand: "برند",
  availability: "موجودی",
  availability_raw: "موجودی",
  notes: "توضیحات",
};
export const AVAILABILITY_LABELS = {
  in_stock: "موجود",
  limited: "محدود",
  out_of_stock: "ناموجود",
  unknown: "نامشخص",
} as const;

export function packUnitText(item: PriceListItem | null): string {
  if (!item) return "—";
  return [item.pack_size === null ? "—" : formatInteger(item.pack_size), item.unit]
    .filter(Boolean)
    .join(" ");
}
export function packUnitPresentation(item: ComparisonItem) {
  return {
    changed:
      item.change_types.includes("PACK_SIZE_CHANGED") || item.change_types.includes("UNIT_CHANGED"),
    previous: packUnitText(item.previous),
    current: packUnitText(item.current),
    display: packUnitText(item.current ?? item.previous),
  };
}
function fieldText(field: string, value: string | number | null): string {
  if (value === null || value === "") return "—";
  if (typeof value === "number") return formatInteger(value);
  if (field === "availability" && value in AVAILABILITY_LABELS) {
    return AVAILABILITY_LABELS[value as keyof typeof AVAILABILITY_LABELS];
  }
  return value;
}
export function metadataChanges(item: ComparisonItem) {
  return item.field_changes
    .filter((change) => change.field in METADATA_LABELS)
    .map((change) => ({
      field: change.field,
      label: METADATA_LABELS[change.field],
      previous: fieldText(change.field, change.previous),
      current: fieldText(change.field, change.current),
    }));
}
