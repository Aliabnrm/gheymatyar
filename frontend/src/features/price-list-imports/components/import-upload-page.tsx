"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplierQuery } from "@/services/suppliers";

import { ImportUploadForm } from "../forms/import-upload-form";

export function ImportUploadPage({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const supplier = useSupplierQuery(supplierId);

  if (supplier.isPending) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10" role="status">
        <Skeleton className="h-72 w-full" />
      </main>
    );
  }

  if (supplier.isError) {
    return (
      <main className="mx-auto grid max-w-3xl gap-5 px-5 py-10">
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {supplier.error.status === 404
              ? "تأمین‌کننده موردنظر پیدا نشد."
              : supplier.error.message}
          </AlertDescription>
        </Alert>
        {supplier.error.status !== 404 ? (
          <Button type="button" onClick={() => supplier.refetch()}>
            <RefreshCw aria-hidden="true" /> تلاش دوباره
          </Button>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">{supplier.data.name}</p>
          <h1 className="text-2xl font-bold">بارگذاری لیست قیمت</h1>
          <p className="text-sm text-muted-foreground">
            فایل پس از اعتبارسنجی استخراج و به‌صورت پیش‌نویس قابل بازبینی ذخیره می‌شود.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/suppliers/${supplierId}`}>
            <ArrowRight aria-hidden="true" /> بازگشت
          </Link>
        </Button>
      </div>

      {!supplier.data.isActive ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            این تأمین‌کننده غیرفعال است. برای بارگذاری جدید ابتدا آن را فعال کنید.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>انتخاب فایل XLSX</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportUploadForm
              supplierId={supplierId}
              onCompleted={(priceListImport) =>
                router.push(`/suppliers/${supplierId}/imports/${priceListImport.id}`)
              }
            />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
