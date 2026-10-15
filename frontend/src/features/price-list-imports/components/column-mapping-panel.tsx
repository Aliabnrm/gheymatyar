"use client";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useMappingReviewQuery } from "@/services/price-list-imports/column-mapping.hooks";
import type { PriceListImportStatus } from "@/services/price-list-imports";
import { ColumnMappingEditor } from "./column-mapping-editor";
interface PanelProps {
  supplierId: string;
  importId: string;
  status: PriceListImportStatus;
}
export function ColumnMappingPanel(props: PanelProps) {
  const [selection, setSelection] = useState<{
    sheet_name: string;
    header_row: number;
  }>();
  const query = useMappingReviewQuery(props.supplierId, props.importId, selection);
  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle>نگاشت ستون‌ها</CardTitle>
        <CardDescription>
          عنوان‌ها و چند ردیف فایل را بررسی کنید. اصلاح نگاشت یک اجرای جدید و قابل بازبینی می‌سازد.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {query.isPending ? (
          <p role="status">در حال دریافت نگاشت…</p>
        ) : query.isError ? (
          <>
            <Alert variant="destructive" role="alert">
              <AlertDescription>{query.error.message}</AlertDescription>
            </Alert>
            <Button type="button" variant="outline" onClick={() => query.refetch()}>
              تلاش دوباره برای دریافت نگاشت
            </Button>
            {selection && (
              <Button type="button" variant="outline" onClick={() => setSelection(undefined)}>
                بازگشت به نگاشت ثبت‌شده
              </Button>
            )}
          </>
        ) : (
          <ColumnMappingEditor
            key={[
              props.supplierId,
              props.importId,
              selection?.sheet_name ?? "stored",
              selection?.header_row ?? 0,
            ].join(":")}
            {...props}
            review={query.data}
            onPreview={setSelection}
          />
        )}
      </CardContent>
    </Card>
  );
}
