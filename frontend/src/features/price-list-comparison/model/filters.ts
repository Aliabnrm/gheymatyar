import type { ComparisonItem } from "@/services/price-list-comparison/price-list-comparison.schema";

import type { ResultFilter } from "./types";

export const RESULT_FILTERS: ReadonlyArray<{
  id: ResultFilter;
  label: string;
}> = [
  { id: "all", label: "همه" },
  { id: "high-risk", label: "نیازمند توجه" },
  { id: "price", label: "تغییر قیمت" },
  { id: "added", label: "جدید" },
  { id: "removed", label: "حذف‌شده" },
  { id: "metadata", label: "اطلاعات" },
  { id: "unchanged", label: "بدون تغییر" },
];

export function filterComparisonItems(
  items: readonly ComparisonItem[],
  filter: ResultFilter,
): ComparisonItem[] {
  switch (filter) {
    case "high-risk":
      return items.filter((item) => item.is_high_risk);
    case "price":
      return items.filter((item) =>
        item.change_types.includes("PRICE_CHANGED"),
      );
    case "added":
      return items.filter((item) => item.change_types.includes("ADDED"));
    case "removed":
      return items.filter((item) => item.change_types.includes("REMOVED"));
    case "metadata":
      return items.filter(
        (item) =>
          !item.change_types.includes("PRICE_CHANGED") &&
          !item.change_types.includes("ADDED") &&
          !item.change_types.includes("REMOVED") &&
          !item.change_types.includes("UNCHANGED"),
      );
    case "unchanged":
      return items.filter((item) => item.change_types.includes("UNCHANGED"));
    case "all":
      return [...items];
  }
}
