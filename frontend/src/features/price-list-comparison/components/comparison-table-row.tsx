import { formatIrr, formatPercent, formatPriceDelta } from "@/utils/format";
import type { ComparisonItem } from "@/services/price-list-comparison/price-list-comparison.schema";
import { PackUnitValue, ChangeFieldDetails } from "@/features/price-list-changes";
import { AVAILABILITY_LABELS } from "@/features/price-list-changes/model/change-presentation";
import { changeLabels, getDeltaClassName } from "../model/comparison-row-presentation";
export function ComparisonTableRow({ item }: { item: ComparisonItem }) {
  const display = item.current ?? item.previous;
  if (!display) return null;
  return (
    <tr className={item.is_high_risk ? "row--risk" : ""} key={item.product_code}>
      <td className="product-cell">
        <strong>{display.product_name_raw}</strong>
        <span dir="ltr">{item.product_code}</span>
        {display.brand ? <small>{display.brand}</small> : null}
      </td>
      <td>
        <div className="change-badges">
          {item.change_types.map((change) => (
            <span className={"change-badge change-badge--" + change.toLowerCase()} key={change}>
              {changeLabels[change]}
            </span>
          ))}
        </div>
        <ChangeFieldDetails item={item} />
      </td>
      <td className="money-cell">{formatIrr(item.previous?.price_irr ?? null)}</td>
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
}
function AvailabilityValue({ item }: { item: ComparisonItem }) {
  const current = item.current ?? item.previous;
  if (!current) return null;
  const label = current.availability_raw ?? AVAILABILITY_LABELS[current.availability];

  return <span className={"availability availability--" + current.availability}>{label}</span>;
}
