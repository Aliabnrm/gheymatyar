import type { ComparisonItem } from "@/services/price-list-shared/price-list-change.schema";
import { metadataChanges } from "../model/change-presentation";

export function ChangeFieldDetails({ item }: { item: ComparisonItem }) {
  const changes = metadataChanges(item);
  if (changes.length === 0) return null;
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer">جزئیات تغییر اطلاعات</summary>
      <dl className="mt-2 grid gap-2 whitespace-normal">
        {changes.map((change) => (
          <div key={change.field}>
            <dt className="font-medium">{change.label}</dt>
            <dd className="break-words">
              <span className="text-muted-foreground">قبلی: </span>
              <bdi>{change.previous}</bdi>
            </dd>
            <dd className="break-words">
              <span className="text-muted-foreground">جدید: </span>
              <bdi>{change.current}</bdi>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
