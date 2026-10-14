import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ComparisonItem } from "@/services/price-list-comparison/price-list-comparison.schema";
import { formatIrr, formatPercent, formatPriceDelta } from "@/utils/format";

import { CHANGE_TYPE_LABELS } from "../model/change-type-labels";

export function PriceListChangeTable({ items }: { items: ComparisonItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        با فیلتر فعلی تغییری پیدا نشد.
      </p>
    );
  }
  return (
    <Table>
      <caption className="sr-only">جزئیات تغییرات نسخه قیمت</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">کالا</TableHead>
          <TableHead scope="col">تغییرها</TableHead>
          <TableHead scope="col">قیمت قبلی</TableHead>
          <TableHead scope="col">قیمت جدید</TableHead>
          <TableHead scope="col">اختلاف</TableHead>
          <TableHead scope="col">بسته / واحد</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const display = item.current ?? item.previous;
          if (!display) return null;
          return (
            <TableRow
              key={item.product_code}
              className={item.is_high_risk ? "bg-amber-50" : ""}
            >
              <TableCell className="min-w-48 whitespace-normal">
                <strong className="block">{display.product_name_raw}</strong>
                <span dir="ltr" className="text-xs text-muted-foreground">
                  {item.product_code}
                </span>
              </TableCell>
              <TableCell className="min-w-40 whitespace-normal">
                <div className="flex flex-wrap gap-1">
                  {item.change_types.map((type) => (
                    <Badge
                      key={type}
                      variant={
                        type === "PACK_SIZE_CHANGED" || type === "UNIT_CHANGED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {CHANGE_TYPE_LABELS[type]}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {formatIrr(item.previous?.price_irr ?? null)}
              </TableCell>
              <TableCell>
                {formatIrr(item.current?.price_irr ?? null)}
              </TableCell>
              <TableCell>
                <span className="block">
                  {formatPriceDelta(item.price_delta_irr)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatPercent(item.price_change_percent)}
                </span>
              </TableCell>
              <TableCell>
                {item.previous?.pack_size ?? "—"} {item.previous?.unit ?? ""}
                {item.is_high_risk ? " ← " : ""}
                {item.is_high_risk
                  ? `${item.current?.pack_size ?? "—"} ${item.current?.unit ?? ""}`
                  : ""}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
