import { Button } from "@/components/ui/button";
import type { ChangeType } from "@/services/price-list-shared/price-list-change.schema";
import { CHANGE_FILTERS } from "../model/change-type-labels";

export function ChangeTypeFilters({
  value,
  onChange,
  label,
}: {
  value: ChangeType | null;
  onChange: (value: ChangeType | null) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label={label}>
      {CHANGE_FILTERS.map((filter) => (
        <Button
          key={filter.value ?? "all"}
          type="button"
          size="sm"
          variant={value === filter.value ? "secondary" : "outline"}
          aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
