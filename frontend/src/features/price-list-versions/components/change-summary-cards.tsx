import { Card, CardContent } from "@/components/ui/card";
import type { ComparisonSummary } from "@/services/price-list-shared/price-list-change.schema";
import { formatInteger } from "@/utils/format";

export function ChangeSummaryCards({ summary }: { summary: ComparisonSummary }) {
  const cards = [
    ["کالای جدید", summary.added],
    ["حذف‌شده", summary.removed],
    ["افزایش قیمت", summary.price_increased],
    ["کاهش قیمت", summary.price_decreased],
    ["تغییر اطلاعات", summary.metadata_only_changed],
    ["تغییر پرخطر", summary.high_risk],
    ["بدون تغییر", summary.unchanged],
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="خلاصه تغییرات">
      {cards.map(([label, value]) => (
        <Card key={label}>
          <CardContent className="grid gap-1 py-4">
            <span className="text-sm text-muted-foreground">{label}</span>
            <strong className="text-2xl">{formatInteger(value)}</strong>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
