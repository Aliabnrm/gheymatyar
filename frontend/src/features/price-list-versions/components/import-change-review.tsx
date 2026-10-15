"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";

import { PaginationControls } from "@/components/shared/pagination-controls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChangeReportFilters } from "../hooks/use-change-report-filters";
import { useImportChangeReportQuery } from "@/services/price-list-versions";
import { useSupplierQuery } from "@/services/suppliers";
import { formatInteger } from "@/utils/format";

import { ChangeSummaryCards } from "./change-summary-cards";
import { CreateVersionPanel } from "./create-version-panel";
import { PriceListChangeTable } from "./price-list-change-table";
import { ChangeTypeFilters } from "./change-type-filters";

export function ImportChangeReview({
  supplierId,
  importId,
}: {
  supplierId: string;
  importId: string;
}) {
  const { filters, selectChangeType: selectFilter, setOffset } = useChangeReportFilters();
  const { changeType, offset, limit } = filters;
  const report = useImportChangeReportQuery(supplierId, importId, {
    changeType,
    limit,
    offset,
  });
  const supplier = useSupplierQuery(supplierId);

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
          <span>{report.isError ? report.error.message : "وضعیت تأمین‌کننده دریافت نشد."}</span>
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
          نتیجه از ردیف‌های استاندارد ذخیره‌شده محاسبه شده و فایل دوباره پردازش نشده است.
        </p>
      </div>

      {!data.baselineVersion ? (
        <Card>
          <CardHeader>
            <CardTitle>اولین نسخه این تأمین‌کننده</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            هنوز نسخه‌ای برای این تأمین‌کننده ثبت نشده است. این Import می‌تواند اولین نسخه
            تغییرناپذیر باشد.
          </CardContent>
        </Card>
      ) : null}

      {data.summary && data.baselineVersion ? (
        <>
          <p className="text-sm text-muted-foreground">
            مقایسه با نسخه {formatInteger(data.baselineVersion.versionNumber)}
          </p>
          <ChangeSummaryCards summary={data.summary} />
          <ChangeTypeFilters value={changeType} onChange={selectFilter} label="فیلتر نوع تغییر" />
          <PriceListChangeTable items={data.items} />
          <PaginationControls
            offset={offset}
            limit={limit}
            total={data.total}
            onOffsetChange={setOffset}
          >
            {formatInteger(data.total)} ردیف
          </PaginationControls>
        </>
      ) : null}

      {data.createdVersion ? (
        <Card>
          <CardHeader>
            <CardTitle>نسخه این Import قبلاً ثبت شده است</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>
              این گزارش با مبنای تاریخی همان نسخه نمایش داده می‌شود و ساخت نسخه تکراری ممکن نیست.
            </p>
            <Button asChild className="w-fit">
              <Link href={`/suppliers/${supplierId}/price-list-versions/${data.createdVersion.id}`}>
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
