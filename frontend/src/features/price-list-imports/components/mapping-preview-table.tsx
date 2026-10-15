import { formatInteger } from "@/utils/format";
import type { MappingReview } from "@/services/price-list-imports/column-mapping.schema";
export function MappingPreviewTable({ snapshot }: { snapshot: MappingReview["inspection"] }) {
  return (
    <section aria-label="پیش‌نمایش فایل" className="grid gap-3">
      <h3 className="font-medium">پیش‌نمایش محدود فایل</h3>
      <p className="text-xs text-muted-foreground">
        حداکثر پنج ردیف و ۲۰۰ نویسه از هر سلول؛ فایل اصلی کامل نگهداری می‌شود.
      </p>
      {snapshot.preview.length === 0 ? (
        <p>ردیفی برای پیش‌نمایش وجود ندارد.</p>
      ) : (
        <div
          className="overflow-x-auto rounded-md border"
          tabIndex={0}
          role="region"
          aria-label="جدول پیش‌نمایش قابل پیمایش"
        >
          <table className="w-full text-sm" aria-label="پیش‌نمایش محدود فایل">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-3 text-start">
                  ردیف فایل
                </th>
                {snapshot.columns.map((column) => (
                  <th scope="col" key={column.index} className="min-w-28 p-3 text-start">
                    {formatInteger(column.index)} — {column.label || "بدون عنوان"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshot.preview.map((row) => (
                <tr className="border-t" key={row.source_row_number}>
                  <th scope="row" className="p-3 text-start">
                    {formatInteger(row.source_row_number)}
                  </th>
                  {snapshot.columns.map((column) => (
                    <td className="max-w-64 break-words p-3" key={column.index}>
                      <bdi>{row.values[column.index - 1] || "—"}</bdi>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
