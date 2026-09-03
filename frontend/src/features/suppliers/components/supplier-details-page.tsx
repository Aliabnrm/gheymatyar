"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentAccountQuery } from "@/services/auth";
import {
  useSupplierQuery,
  useUpdateSupplierMutation,
  type SupplierNameInput,
} from "@/services/suppliers";

import { SupplierPageHeader } from "./supplier-page-header";
import { SupplierStatusBadge } from "./supplier-status-badge";
import { SupplierNameForm } from "../forms/supplier-name-form";

export function SupplierDetailsPage({ supplierId }: { supplierId: string }) {
  const account = useCurrentAccountQuery();
  const supplier = useSupplierQuery(supplierId);
  const update = useUpdateSupplierMutation();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
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

  async function rename(input: SupplierNameInput): Promise<void> {
    update.reset();
    try {
      await update.mutateAsync({ supplierId, input: { name: input.name } });
    } catch {
      // Mutation state is rendered and focused by SupplierNameForm.
    }
  }

  async function changeStatus(): Promise<void> {
    update.reset();
    try {
      await update.mutateAsync({
        supplierId,
        input: { isActive: !data.isActive },
      });
      setConfirmDeactivate(false);
    } catch {
      // The shared mutation error is rendered in the edit card.
    }
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 py-10">
      <SupplierPageHeader
        title={data.name}
        description="این شناسه فقط برای مسیریابی است؛ مجوز دسترسی همیشه از سازمان متصل به نشست بررسی می‌شود."
        action={
          <Button asChild variant="outline">
            <Link href="/suppliers">
              <ArrowRight aria-hidden="true" /> بازگشت
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>وضعیت تأمین‌کننده</CardTitle>
          <SupplierStatusBadge isActive={data.isActive} />
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <p>
            <span className="text-muted-foreground">شناسه: </span>
            <span dir="ltr">{data.id}</span>
          </p>
          <p>
            <span className="text-muted-foreground">آخرین تغییر: </span>
            {new Intl.DateTimeFormat("fa-IR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(data.updatedAt))}
          </p>
          {isOwner ? (
            data.isActive && !confirmDeactivate ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDeactivate(true)}
              >
                غیرفعال‌کردن
              </Button>
            ) : data.isActive ? (
              <Alert role="alert">
                <AlertDescription className="grid gap-3">
                  <span>
                    تأمین‌کننده حذف نمی‌شود و نام آن برای حفظ تاریخچه رزرو
                    می‌ماند. ادامه می‌دهید؟
                  </span>
                  <span className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={update.isPending}
                      onClick={() => void changeStatus()}
                    >
                      تأیید غیرفعال‌سازی
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDeactivate(false)}
                    >
                      انصراف
                    </Button>
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                type="button"
                disabled={update.isPending}
                onClick={() => void changeStatus()}
              >
                فعال‌کردن دوباره
              </Button>
            )
          ) : (
            <p className="text-muted-foreground">
              دسترسی شما برای مشاهده این اطلاعات است.
            </p>
          )}
        </CardContent>
      </Card>
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
              isPending={update.isPending}
              error={update.error}
              onSubmit={rename}
            />
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
