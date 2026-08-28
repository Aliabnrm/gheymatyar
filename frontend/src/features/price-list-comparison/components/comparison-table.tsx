import { formatIrr, formatPercent, formatPriceDelta } from "@/utils/format";
import type {
  ChangeType,
  ComparisonItem,
} from "@/services/price-list-comparison/price-list-comparison.schema";

interface ComparisonTableProps {
  items: readonly ComparisonItem[];
}

const changeLabels: Record<ChangeType, string> = {
  ADDED: "جدید",
  REMOVED: "حذف‌شده",
  PRICE_CHANGED: "قیمت",
  PACK_SIZE_CHANGED: "تعداد بسته",
  UNIT_CHANGED: "واحد",
  NAME_CHANGED: "نام",
  BRAND_CHANGED: "برند",
  AVAILABILITY_CHANGED: "موجودی",
  NOTES_CHANGED: "توضیحات",
  UNCHANGED: "بدون تغییر",
};

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
        <caption className="visually-hidden">
          جزئیات تغییرات دو نسخه لیست قیمت
        </caption>
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
          {items.map((item) => {
            const display = item.current ?? item.previous;
            if (!display) return null;
            return (
              <tr
                className={item.is_high_risk ? "row--risk" : ""}
                key={item.product_code}
              >
                <td className="product-cell">
                  <strong>{display.product_name_raw}</strong>
                  <span dir="ltr">{item.product_code}</span>
                  {display.brand ? <small>{display.brand}</small> : null}
                </td>
                <td>
                  <div className="change-badges">
                    {item.change_types.map((change) => (
                      <span
                        className={
                          "change-badge change-badge--" + change.toLowerCase()
                        }
                        key={change}
                      >
                        {changeLabels[change]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="money-cell">
                  {formatIrr(item.previous?.price_irr ?? null)}
                </td>
                <td className="money-cell money-cell--current">
                  {formatIrr(item.current?.price_irr ?? null)}
                </td>
                <td>
                  <div className={getDeltaClassName(item.price_delta_irr)}>
                    <span>{formatPriceDelta(item.price_delta_irr)}</span>
                    <small>{formatPercent(item.price_change_percent)}</small>
                  </div>
                </td>
                <td>
                  <PackUnitValue item={item} />
                </td>
                <td>
                  <AvailabilityValue item={item} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getDeltaClassName(delta: number | null): string {
  if (delta !== null && delta < 0) return "delta-cell delta-cell--down";
  if (delta !== null && delta > 0) return "delta-cell delta-cell--up";
  return "delta-cell";
}

function PackUnitValue({ item }: { item: ComparisonItem }) {
  const previous = item.previous;
  const current = item.current;
  const changed =
    item.change_types.includes("PACK_SIZE_CHANGED") ||
    item.change_types.includes("UNIT_CHANGED");

  if (!changed) {
    const display = current ?? previous;
    return (
      <span className="pack-value">
        {display?.pack_size ?? "—"} {display?.unit ?? ""}
      </span>
    );
  }

  return (
    <div className="pack-change">
      <span>
        {previous?.pack_size ?? "—"} {previous?.unit ?? ""}
      </span>
      <b aria-hidden="true">←</b>
      <strong>
        {current?.pack_size ?? "—"} {current?.unit ?? ""}
      </strong>
    </div>
  );
}

function AvailabilityValue({ item }: { item: ComparisonItem }) {
  const current = item.current ?? item.previous;
  if (!current) return null;
  const label =
    current.availability_raw ??
    {
      in_stock: "موجود",
      limited: "محدود",
      out_of_stock: "ناموجود",
      unknown: "نامشخص",
    }[current.availability];

  return (
    <span className={"availability availability--" + current.availability}>
      {label}
    </span>
  );
}
