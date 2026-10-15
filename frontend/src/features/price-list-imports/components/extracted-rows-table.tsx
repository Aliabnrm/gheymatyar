"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { PaginationControls } from "@/components/shared/pagination-controls";
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
import { AVAILABILITY_LABELS } from "@/features/price-list-changes";

export function ExtractedRowsTable({
  supplierId,
  importId,
}: {
  supplierId: string;
  importId: string;
}) {
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const rows = useExtractedRowsQuery(supplierId, importId, { limit, offset }, true);

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
          <Button type="button" size="sm" variant="outline" onClick={() => rows.refetch()}>
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
              <TableCell className="max-w-72 whitespace-normal">{row.productNameRaw}</TableCell>
              <TableCell>{row.brand ?? "—"}</TableCell>
              <TableCell>{row.unit ?? "—"}</TableCell>
              <TableCell>{row.packSize === null ? "—" : formatInteger(row.packSize)}</TableCell>
              <TableCell dir="ltr" className="text-start">
                {formatIrr(row.priceIrr)}
              </TableCell>
              <TableCell>{AVAILABILITY_LABELS[row.availability]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationControls
        offset={offset}
        limit={limit}
        total={rows.data.total}
        onOffsetChange={setOffset}
      >
        {formatInteger(offset + 1)} تا {formatInteger(Math.min(offset + limit, rows.data.total))} از{" "}
        {formatInteger(rows.data.total)}
      </PaginationControls>
    </div>
  );
}
