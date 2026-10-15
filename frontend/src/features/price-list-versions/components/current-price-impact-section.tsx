import { RefreshCw } from "lucide-react";
import { formatInteger } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeTypeFilters } from "./change-type-filters";
import { ChangeSummaryCards } from "./change-summary-cards";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PriceListChangeTable } from "./price-list-change-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import type { useCurrentPriceImpactReview } from "../hooks/use-current-price-impact-review";

export function CurrentPriceImpactSection({
  review,
  historicalBaselineId,
}: {
  review: ReturnType<typeof useCurrentPriceImpactReview>;
  historicalBaselineId: string | null;
}) {
  const report = review.report;
  return (
    <section className="grid gap-4" aria-labelledby="current-impact-title">
      <h2 id="current-impact-title" className="text-xl font-semibold">
        اثر این نسخه بر قیمت جاری
      </h2>
      {review.status === "terminal" ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          این گزارش زنده فقط تا پیش از تصمیم نهایی نسخه نمایش داده می‌شود. سابقه تصمیم در بخش
          رویدادهای ممیزی باقی می‌ماند.
        </p>
      ) : null}
      {review.status === "loading" ? <Skeleton className="h-40 w-full" role="status" /> : null}
      {review.status === "error" && review.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="grid gap-3">
            <span>
              {review.error.status === 409
                ? "قیمت جاری یا وضعیت نسخه تغییر کرده است. گزارش تازه را دوباره دریافت و بررسی کنید."
                : review.error.message}
            </span>
            <Button type="button" variant="outline" className="w-fit" onClick={review.restart}>
              <RefreshCw aria-hidden="true" /> دریافت گزارش تازه
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {report?.baselineStatus === "NO_CURRENT" ? (
        <Alert role="status">
          <AlertDescription>
            هنوز قیمت جاری تأییدشده‌ای وجود ندارد؛ این نسخه در صورت تأیید، اولین قیمت جاری خواهد شد.
            نسخه هدف: نسخه {formatInteger(report.targetVersion.versionNumber)}.
          </AlertDescription>
        </Alert>
      ) : null}
      {report?.baselineStatus === "CURRENT_BASELINE" && report.summary ? (
        <>
          <p className="text-sm text-muted-foreground">
            مبنای عملیاتی: قیمت جاری نسخه {formatInteger(report.baselineVersion.versionNumber)}؛
            نسخه هدف: {formatInteger(report.targetVersion.versionNumber)}. این گزارش نشان می‌دهد
            تأیید نسخه هدف چه اثری بر قیمت جاری دارد.
          </p>
          {historicalBaselineId === report.baselineVersion?.id ? (
            <p className="text-sm text-muted-foreground">
              شماره مبنای دو گزارش برابر است، اما گزارش تاریخی و گزارش اثر بر قیمت جاری همچنان دو
              معنای متفاوت دارند.
            </p>
          ) : null}
          <ChangeSummaryCards summary={report.summary} />
          <ChangeTypeFilters
            value={review.filters.changeType}
            onChange={review.selectChangeType}
            label="فیلتر اثر بر قیمت جاری"
          />
          <PriceListChangeTable items={report.items} />
          <PaginationControls
            {...review.filters}
            total={report.total}
            onOffsetChange={review.setOffset}
          >
            {formatInteger(report.total)} تغییر
          </PaginationControls>
        </>
      ) : null}
    </section>
  );
}
