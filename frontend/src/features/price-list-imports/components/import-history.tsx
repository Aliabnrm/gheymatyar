"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePriceListImportsQuery,
  type PriceListImportStatusFilter,
} from "@/services/price-list-imports";
import { formatInteger } from "@/utils/format";

import { ImportStatusBadge } from "./import-status-badge";
import { formatImportDateTime } from "../model/import-formatters";

const STATUS_FILTER_LABELS: Record<PriceListImportStatusFilter, string> = {
  all: "همه",
  draft: "پیش‌نویس",
  failed: "ناموفق",
};

export function ImportHistory({
  supplierId,
  supplierIsActive,
}: {
  supplierId: string;
  supplierIsActive: boolean;
}) {
  const [status, setStatus] = useState<PriceListImportStatusFilter>("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const imports = usePriceListImportsQuery(supplierId, {
    status,
    limit,
    offset,
  });

  function selectStatus(nextStatus: PriceListImportStatusFilter): void {
    setStatus(nextStatus);
    setOffset(0);
  }

  return (
    <section className="grid gap-5" aria-labelledby="supplier-imports-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 id="supplier-imports-title" className="text-xl font-semibold">
            فایل‌های قیمت
          </h2>
          <p className="text-sm text-muted-foreground">
            فایل اصلی، نتیجه استخراج و تاریخچه Importهای این تأمین‌کننده.
          </p>
        </div>
        {supplierIsActive ? (
          <Button asChild>
            <Link href={`/suppliers/${supplierId}/imports/new`}>
              <Plus aria-hidden="true" /> بارگذاری فایل قیمت
            </Link>
          </Button>
        ) : null}
      </div>

      {!supplierIsActive ? (
        <Alert role="status">
          <AlertDescription>
            تاریخچه قابل مشاهده است، اما برای بارگذاری جدید باید تأمین‌کننده را
            فعال کنید.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2" aria-label="فیلتر وضعیت Import">
        {(
          Object.keys(STATUS_FILTER_LABELS) as PriceListImportStatusFilter[]
        ).map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={status === filter ? "secondary" : "outline"}
            aria-pressed={status === filter}
            onClick={() => selectStatus(filter)}
          >
            {STATUS_FILTER_LABELS[filter]}
          </Button>
        ))}
      </div>

      {imports.isPending ? (
        <div
          className="grid gap-3"
          role="status"
          aria-label="در حال دریافت تاریخچه فایل‌ها"
        >
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {imports.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{imports.error.message}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => imports.refetch()}
            >
              <RefreshCw aria-hidden="true" /> تلاش دوباره
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {imports.data?.items.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 py-10 text-center">
            <h3 className="font-semibold">فایلی در این وضعیت وجود ندارد.</h3>
            <p className="text-sm text-muted-foreground">
              {supplierIsActive
                ? "اولین فایل XLSX این تأمین‌کننده را بارگذاری کنید."
                : "پس از فعال‌سازی تأمین‌کننده می‌توانید فایل جدید بارگذاری کنید."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {imports.data && imports.data.items.length > 0 ? (
        <div className="grid gap-3">
          {imports.data.items.map((priceListImport) => (
            <Card key={priceListImport.id}>
              <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
                <div className="grid min-w-0 gap-1">
                  <CardTitle className="truncate text-base">
                    <Link
                      className="hover:underline"
                      href={`/suppliers/${supplierId}/imports/${priceListImport.id}`}
                    >
                      {priceListImport.sourceDocument.originalFilename}
                    </Link>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {formatImportDateTime(priceListImport.createdAt)} ·{" "}
                    {formatInteger(priceListImport.rowCount)} ردیف
                  </p>
                </div>
                <ImportStatusBadge status={priceListImport.status} />
              </CardHeader>
            </Card>
          ))}
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
              {formatInteger(offset + 1)} تا{" "}
              {formatInteger(Math.min(offset + limit, imports.data.total))} از{" "}
              {formatInteger(imports.data.total)}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={offset + limit >= imports.data.total}
              onClick={() => setOffset(offset + limit)}
            >
              صفحه بعد
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
