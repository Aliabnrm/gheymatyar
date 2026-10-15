"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportHistory } from "@/features/price-list-imports";
import { CurrentVersionCard, VersionHistory } from "@/features/price-list-versions";
import { useCurrentAccountQuery } from "@/services/auth";
import { useSupplierQuery } from "@/services/suppliers";

import { SupplierPageHeader } from "./supplier-page-header";
import { SupplierStatusCard } from "./supplier-status-card";
import { useSupplierEditor } from "../hooks/use-supplier-editor";
import { SupplierNameForm } from "../forms/supplier-name-form";

export function SupplierDetailsPage({ supplierId }: { supplierId: string }) {
  const account = useCurrentAccountQuery();
  const supplier = useSupplierQuery(supplierId);
  const editor = useSupplierEditor(supplierId, supplier.data);
  const isOwner = account.data?.membership.role === "OWNER";

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
        <Alert role="alert" variant="destructive">
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
        <Button asChild variant="outline">
          <Link href="/suppliers">بازگشت به فهرست</Link>
        </Button>
      </main>
    );
  }

  const data = supplier.data;

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 py-10">
      <SupplierPageHeader
        title={data.name}
        description="فایل‌های قیمت، نسخه جاری و سابقه بررسی این تأمین‌کننده."
        action={
          <Button asChild variant="outline">
            <Link href="/suppliers">
              <ArrowRight aria-hidden="true" /> بازگشت
            </Link>
          </Button>
        }
      />
      <SupplierStatusCard data={data} isOwner={isOwner} editor={editor} />
      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>ویرایش نام</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierNameForm
              key={data.id}
              initialName={data.name}
              submitLabel="ذخیره نام"
              pendingLabel="در حال ذخیره…"
              isPending={editor.pending}
              error={editor.name.error}
              onSubmit={editor.rename}
            />
          </CardContent>
        </Card>
      ) : null}
      <CurrentVersionCard supplierId={supplierId} />
      <ImportHistory supplierId={supplierId} supplierIsActive={data.isActive} />
      <VersionHistory supplierId={supplierId} />
    </main>
  );
}
