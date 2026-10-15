import type { ComparisonItem } from "@/services/price-list-shared/price-list-change.schema";
import { packUnitPresentation } from "../model/change-presentation";

export function PackUnitValue({ item }: { item: ComparisonItem }) {
  const value = packUnitPresentation(item);
  if (!value.changed) return <span className="pack-value">{value.display}</span>;
  return (
    <div className="pack-change flex items-center gap-1.5 whitespace-nowrap">
      <span>{value.previous}</span>
      <b aria-hidden="true">←</b>
      <strong>{value.current}</strong>
    </div>
  );
}
