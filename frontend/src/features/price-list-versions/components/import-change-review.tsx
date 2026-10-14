"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChangeType } from "@/services/price-list-comparison/price-list-comparison.schema";
import { useImportChangeReportQuery } from "@/services/price-list-versions";
import { useSupplierQuery } from "@/services/suppliers";
import { formatInteger } from "@/utils/format";

import { ChangeSummaryCards } from "./change-summary-cards";
import { CreateVersionPanel } from "./create-version-panel";
import { PriceListChangeTable } from "./price-list-change-table";
import { CHANGE_FILTERS } from "../model/change-type-labels";

export function ImportChangeReview({
  supplierId,
  importId,
}: {
  supplierId: string;
  importId: string;
}) {
  const [changeType, setChangeType] = useState<ChangeType | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const report = useImportChangeReportQuery(supplierId, importId, {
    changeType,
    limit,
    offset,
  });
  const supplier = useSupplierQuery(supplierId);

  function selectFilter(next: ChangeType | null): void {
    setChangeType(next);
    setOffset(0);
  }

  if (report.isPending || supplier.isPending) {
    return (
      <div role="status" aria-label="در حال دریافت مقایسه نسخه قیمت">
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (report.isError || supplier.isError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>
            {report.isError
              ? report.error.message
              : "وضعیت تأمین‌کننده دریافت نشد."}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void report.refetch();
              void supplier.refetch();
            }}
          >
            <RefreshCw aria-hidden="true" /> تلاش دوباره
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const data = report.data;
  const supplierIsActive = supplier.data.isActive;
  return (
    <section className="grid gap-5" aria-labelledby="import-comparison-title">
      <div>
        <h2 id="import-comparison-title" className="text-xl font-semibold">
          مقایسه با آخرین نسخه ثبت‌شده
        </h2>
        <p className="text-sm text-muted-foreground">
          نتیجه از ردیف‌های استاندارد ذخیره‌شده محاسبه شده و فایل دوباره پردازش
          نشده است.
        </p>
      </div>

      {!data.baselineVersion ? (
        <Card>
          <CardHeader>
            <CardTitle>اولین نسخه این تأمین‌کننده</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            هنوز نسخه‌ای برای این تأمین‌کننده ثبت نشده است. این Import می‌تواند
            اولین نسخه تغییرناپذیر باشد.
          </CardContent>
        </Card>
      ) : null}

      {data.summary ? (
        <>
          <p className="text-sm text-muted-foreground">
            مقایسه با نسخه {formatInteger(data.baselineVersion!.versionNumber)}
          </p>
          <ChangeSummaryCards summary={data.summary} />
          <div className="flex flex-wrap gap-2" aria-label="فیلتر نوع تغییر">
            {CHANGE_FILTERS.map((filter) => (
              <Button
                key={filter.value ?? "all"}
                type="button"
                size="sm"
                variant={changeType === filter.value ? "secondary" : "outline"}
                aria-pressed={changeType === filter.value}
                onClick={() => selectFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <PriceListChangeTable items={data.items} />
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              صفحه قبل
            </Button>
            <span className="text-sm text-muted-foreground">
              {formatInteger(data.total)} ردیف
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={offset + limit >= data.total}
              onClick={() => setOffset(offset + limit)}
            >
              صفحه بعد
            </Button>
          </div>
        </>
      ) : null}

      {data.createdVersion ? (
        <Card>
          <CardHeader>
            <CardTitle>نسخه این Import قبلاً ثبت شده است</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>
              این گزارش با مبنای تاریخی همان نسخه نمایش داده می‌شود و ساخت نسخه
              تکراری ممکن نیست.
            </p>
            <Button asChild className="w-fit">
              <Link
                href={`/suppliers/${supplierId}/price-list-versions/${data.createdVersion.id}`}
              >
                مشاهده نسخه ثبت‌شده
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CreateVersionPanel
          supplierId={supplierId}
          importId={importId}
          expectedPreviousVersionId={data.baselineVersion?.id ?? null}
          supplierIsActive={supplierIsActive}
        />
      )}
    </section>
  );
}
