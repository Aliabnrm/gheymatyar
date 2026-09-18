"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePriceListImportQuery } from "@/services/price-list-imports";
import { formatInteger } from "@/utils/format";

import { ColumnMappingPanel } from "./column-mapping-panel";
import { BlockingImportError } from "./blocking-import-error";
import { ExtractedRowsTable } from "./extracted-rows-table";
import { ImportStatusBadge } from "./import-status-badge";
import {
  formatFileSize,
  formatImportDateTime,
} from "../model/import-formatters";

export function ImportDetailsPage({
  supplierId,
  importId,
}: {
  supplierId: string;
  importId: string;
}) {
  const priceListImport = usePriceListImportQuery(supplierId, importId);

  if (priceListImport.isPending) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-10" role="status">
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  if (priceListImport.isError) {
    return (
      <main className="mx-auto grid max-w-3xl gap-5 px-5 py-10">
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {priceListImport.error.status === 404
              ? "Import موردنظر پیدا نشد."
              : priceListImport.error.message}
          </AlertDescription>
        </Alert>
        {priceListImport.error.status !== 404 ? (
          <Button type="button" onClick={() => priceListImport.refetch()}>
            <RefreshCw aria-hidden="true" /> تلاش دوباره
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={`/suppliers/${supplierId}`}>بازگشت به تأمین‌کننده</Link>
        </Button>
      </main>
    );
  }

  const data = priceListImport.data;
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-2">
          <p className="text-sm text-muted-foreground">{data.supplier.name}</p>
          <h1 className="break-words text-2xl font-bold">
            {data.sourceDocument.originalFilename}
          </h1>
          <ImportStatusBadge status={data.status} />
        </div>
        <Button asChild variant="outline">
          <Link href={`/suppliers/${supplierId}`}>
            <ArrowRight aria-hidden="true" /> بازگشت
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مشخصات فایل و Import</CardTitle>
          <CardDescription>
            فایل اصلی نگهداری شده و این اطلاعات از metadata امن آن نمایش داده
            می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">تعداد ردیف</dt>
              <dd className="font-medium">{formatInteger(data.rowCount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">حجم فایل</dt>
              <dd className="font-medium">
                {formatFileSize(data.sourceDocument.sizeBytes)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">زمان بارگذاری</dt>
              <dd className="font-medium">
                {formatImportDateTime(data.createdAt)}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-muted-foreground">اثر انگشت SHA-256</dt>
              <dd className="break-all font-mono text-xs" dir="ltr">
                {data.sourceDocument.sha256Hex}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {data.parentImportId && (
        <Link
          className="text-sm underline"
          href={`/suppliers/${supplierId}/imports/${data.parentImportId}`}
        >
          مشاهده اجرای قبلی این فایل
        </Link>
      )}
      <ColumnMappingPanel
        key={importId}
        supplierId={supplierId}
        importId={importId}
        status={data.status}
      />

      {data.status === "FAILED" && data.blockingError ? (
        <BlockingImportError error={data.blockingError} />
      ) : null}

      {data.status === "DRAFT" ? (
        <section className="grid gap-4" aria-labelledby="extracted-rows-title">
          <div>
            <h2 id="extracted-rows-title" className="text-xl font-semibold">
              ردیف‌های استخراج‌شده
            </h2>
            <p className="text-sm text-muted-foreground">
              این داده‌ها پیش‌نویس‌اند و هنوز تأیید یا منتشر نشده‌اند.
            </p>
          </div>
          <ExtractedRowsTable supplierId={supplierId} importId={importId} />
        </section>
      ) : null}
    </main>
  );
}
