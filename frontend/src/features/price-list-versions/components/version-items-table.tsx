"use client";

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
import { usePriceListVersionItemsQuery } from "@/services/price-list-versions";
import { formatInteger, formatIrr } from "@/utils/format";

export function VersionItemsTable({
  supplierId,
  versionId,
}: {
  supplierId: string;
  versionId: string;
}) {
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const rows = usePriceListVersionItemsQuery(supplierId, versionId, {
    limit,
    offset,
  });
  if (rows.isPending)
    return (
      <div role="status" aria-label="در حال دریافت کالاهای نسخه">
        <Skeleton className="h-52 w-full" />
      </div>
    );
  if (rows.isError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription>{rows.error.message}</AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="grid gap-3">
      {rows.data.items.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          در این صفحه کالایی وجود ندارد.
        </p>
      ) : (
        <Table>
          <caption className="sr-only">کالاهای نسخه ثبت‌شده</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">ردیف</TableHead>
              <TableHead scope="col">کد کالا</TableHead>
              <TableHead scope="col">نام کالا</TableHead>
              <TableHead scope="col">قیمت</TableHead>
              <TableHead scope="col">واحد / بسته</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.items.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatInteger(row.sourceRowNumber)}</TableCell>
                <TableCell dir="ltr">{row.productCodeRaw}</TableCell>
                <TableCell>{row.productNameRaw}</TableCell>
                <TableCell>{formatIrr(row.priceIrr)}</TableCell>
                <TableCell>
                  {row.packSize ?? "—"} {row.unit ?? ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
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
          {formatInteger(rows.data.total)} کالا
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
