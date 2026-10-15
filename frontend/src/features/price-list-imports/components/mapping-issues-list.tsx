import { formatInteger } from "@/utils/format";
import type { MappingReview } from "@/services/price-list-imports/column-mapping.schema";
import { fieldLabels } from "../model/column-mapping";
export function MappingIssuesList({ snapshot }: { snapshot: MappingReview["inspection"] }) {
  return (
    <>
      {" "}
      {snapshot.issues.length > 0 && (
        <section className="grid gap-2" aria-label="خطاهای داده">
          <h3 className="font-medium text-destructive">
            خطاهای مسدودکننده ({formatInteger(snapshot.total_errors)})
          </h3>
          <ul className="grid max-h-80 gap-2 overflow-y-auto text-sm">
            {snapshot.issues.map((issue, index) => (
              <li className="rounded border border-destructive/30 p-3" key={index}>
                {issue.row ? `ردیف ${formatInteger(issue.row)} · ` : ""}
                {issue.field ? `${fieldLabels[issue.field]} · ` : ""}
                <bdi className="font-mono text-xs">{issue.code}</bdi>
                <p>{issue.message}</p>
              </li>
            ))}
          </ul>
          {snapshot.errors_truncated && (
            <p>فقط صد خطای نخست نمایش داده شده‌اند؛ هیچ ردیف ناقصی ذخیره نشده است.</p>
          )}
          <p className="text-xs text-muted-foreground">
            اگر ستون درست انتخاب شده اما مقدار آن خطا دارد، فایل Excel را اصلاح و به‌عنوان فایل تازه
            بارگذاری کنید.
          </p>
        </section>
      )}
    </>
  );
}
