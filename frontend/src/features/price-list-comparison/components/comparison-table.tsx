import type { ComparisonItem } from "@/services/price-list-comparison/price-list-comparison.schema";
import { ComparisonTableRow } from "./comparison-table-row";
interface ComparisonTableProps {
  items: readonly ComparisonItem[];
}

export function ComparisonTable({ items }: ComparisonTableProps) {
  if (items.length === 0) {
    return (
      <div className="table-empty">
        <span aria-hidden="true">⌕</span>
        <p>با فیلتر فعلی موردی پیدا نشد.</p>
      </div>
    );
  }

  return (
    <div className="table-shell" tabIndex={0}>
      <table className="comparison-table">
        <caption className="visually-hidden">جزئیات تغییرات دو نسخه لیست قیمت</caption>
        <thead>
          <tr>
            <th scope="col">کالا</th>
            <th scope="col">تغییرها</th>
            <th scope="col">قیمت قبلی</th>
            <th scope="col">قیمت جدید</th>
            <th scope="col">اختلاف</th>
            <th scope="col">بسته / واحد</th>
            <th scope="col">موجودی</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ComparisonTableRow key={item.product_code} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
