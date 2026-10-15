import type {
  CanonicalField,
  ColumnMapping,
  MappingReview,
} from "@/services/price-list-imports/column-mapping.schema";
import { formatInteger } from "@/utils/format";
import { mappingFields } from "../model/column-mapping";
import { mappingSelectClass } from "./mapping-source-form";
export function MappingColumnFields({
  mapping,
  snapshot,
  disabled,
  onChange,
}: {
  mapping: ColumnMapping;
  snapshot: MappingReview["inspection"];
  disabled: boolean;
  onChange: (field: CanonicalField, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {mappingFields.map(({ field, label, required }) => (
        <label key={field} className="grid gap-2 text-sm">
          {label}
          {required ? " *" : ""}
          <select
            className={mappingSelectClass}
            value={mapping.columns[field] ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(field, e.target.value)}
            aria-required={required}
            aria-invalid={required && !mapping.columns[field]}
          >
            <option value="">انتخاب نشده</option>
            {snapshot.columns.map((column) => (
              <option key={column.index} value={column.index}>
                {formatInteger(column.index)} — {column.label || "بدون عنوان"}
              </option>
            ))}
          </select>
          {snapshot.ambiguous_fields[field] && (
            <span className="text-xs text-destructive">
              چند ستون کاندید تشخیص داده شد؛ انتخاب را بازبینی کنید.
            </span>
          )}
        </label>
      ))}
    </div>
  );
}
