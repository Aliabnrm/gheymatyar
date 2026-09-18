"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useExtractedRowsQuery } from "@/services/price-list-imports";
import { formatInteger, formatIrr } from "@/utils/format";

const AVAILABILITY_LABELS = {
  in_stock: "موجود",
  limited: "محدود",
  out_of_stock: "ناموجود",
  unknown: "نامشخص",
} as const;

export function ExtractedRowsTable({
  supplierId,
  importId,
}: {
  supplierId: string;
  importId: string;
}) {
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const rows = useExtractedRowsQuery(
    supplierId,
    importId,
    { limit, offset },
    true,
  );

  if (rows.isPending) {
    return (
      <div role="status" aria-label="در حال دریافت ردیف‌های استخراج‌شده">
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (rows.isError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>{rows.error.message}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => rows.refetch()}
          >
            <RefreshCw aria-hidden="true" /> تلاش دوباره
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4">
      <Table aria-label="ردیف‌های استخراج‌شده لیست قیمت">
        <TableHeader>
          <TableRow>
            <TableHead>سطر</TableHead>
            <TableHead>کد کالا</TableHead>
            <TableHead>نام کالا</TableHead>
            <TableHead>برند</TableHead>
            <TableHead>واحد</TableHead>
            <TableHead>تعداد بسته</TableHead>
            <TableHead>قیمت</TableHead>
            <TableHead>موجودی</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.data.items.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{formatInteger(row.sourceRowNumber)}</TableCell>
              <TableCell dir="ltr" className="text-start font-medium">
                {row.productCodeRaw}
              </TableCell>
              <TableCell className="max-w-72 whitespace-normal">
                {row.productNameRaw}
              </TableCell>
              <TableCell>{row.brand ?? "—"}</TableCell>
              <TableCell>{row.unit ?? "—"}</TableCell>
              <TableCell>
                {row.packSize === null ? "—" : formatInteger(row.packSize)}
              </TableCell>
              <TableCell dir="ltr" className="text-start">
                {formatIrr(row.priceIrr)}
              </TableCell>
              <TableCell>{AVAILABILITY_LABELS[row.availability]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
          {formatInteger(Math.min(offset + limit, rows.data.total))} از{" "}
          {formatInteger(rows.data.total)}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={offset + limit >= rows.data.total}
          onClick={() => setOffset(offset + limit)}
        >
          صفحه بعد
        </Button>
      </div>
    </div>
  );
}
