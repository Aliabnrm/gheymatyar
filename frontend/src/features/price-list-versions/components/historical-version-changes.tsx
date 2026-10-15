"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInteger } from "@/utils/format";

import { PaginationControls } from "@/components/shared/pagination-controls";
import { usePriceListVersionChangesQuery } from "@/services/price-list-versions";
import { useChangeReportFilters } from "../hooks/use-change-report-filters";
import { ChangeSummaryCards } from "./change-summary-cards";
import { ChangeTypeFilters } from "./change-type-filters";
import { PriceListChangeTable } from "./price-list-change-table";
export function HistoricalVersionChanges({
  supplierId,
  versionId,
  versionNumber,
}: {
  supplierId: string;
  versionId: string;
  versionNumber: number;
}) {
  const { filters, selectChangeType, setOffset } = useChangeReportFilters();
  const changes = usePriceListVersionChangesQuery(supplierId, versionId, filters);
  return (
    <section className="grid gap-4" aria-labelledby="version-changes-title">
      <h2 id="version-changes-title" className="text-xl font-semibold">
        تغییرات نسبت به نسخه قبلی ثبت‌شده
      </h2>
      {changes.isPending ? <Skeleton className="h-40 w-full" /> : null}
      {changes.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{changes.error.message}</AlertDescription>
        </Alert>
      ) : null}
      {changes.data && !changes.data.baselineVersion ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          این اولین نسخه ثبت‌شده است و نسخه قبلی برای مقایسه ندارد.
        </p>
      ) : null}
      {changes.data?.summary && changes.data.baselineVersion ? (
        <>
          <p className="text-sm text-muted-foreground">
            مبنای تاریخی: نسخه {formatInteger(changes.data.baselineVersion.versionNumber)}؛ نسخه
            هدف: {formatInteger(versionNumber)}. این مبنا حتی اگر نسخه قبلی رد شده باشد، برای حفظ
            تاریخچه تغییر نمی‌کند.
          </p>
          <ChangeSummaryCards summary={changes.data.summary} />
          <ChangeTypeFilters
            value={filters.changeType}
            onChange={selectChangeType}
            label="فیلتر تغییرات نسخه"
          />
          <PriceListChangeTable items={changes.data.items} />
          <PaginationControls {...filters} total={changes.data.total} onOffsetChange={setOffset}>
            {formatInteger(changes.data.total)} تغییر
          </PaginationControls>
        </>
      ) : null}
    </section>
  );
}
