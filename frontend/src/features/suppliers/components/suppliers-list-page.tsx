"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentAccountQuery } from "@/services/auth";
import {
  useSuppliersQuery,
  type SupplierStatusFilter,
} from "@/services/suppliers";

import { SupplierPageHeader } from "./supplier-page-header";
import { SupplierStatusBadge } from "./supplier-status-badge";

const STATUS_LABELS: Record<SupplierStatusFilter, string> = {
  active: "فعال",
  inactive: "غیرفعال",
  all: "همه",
};

export function SuppliersListPage() {
  const [status, setStatus] = useState<SupplierStatusFilter>("active");
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const account = useCurrentAccountQuery();
  const suppliers = useSuppliersQuery({ status, limit, offset });
  const isOwner = account.data?.membership.role === "OWNER";

  function changeStatus(next: SupplierStatusFilter): void {
    setStatus(next);
    setOffset(0);
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10">
      <SupplierPageHeader
        title="تأمین‌کنندگان"
        description="هویت هر لیست قیمت از این بخش مشخص می‌شود و داده‌ها فقط در سازمان جاری قابل مشاهده‌اند."
        action={
          isOwner ? (
            <Button asChild>
              <Link href="/suppliers/new">
                <Plus aria-hidden="true" />
                تأمین‌کننده جدید
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2" aria-label="فیلتر وضعیت">
        {(Object.keys(STATUS_LABELS) as SupplierStatusFilter[]).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={status === value ? "secondary" : "outline"}
            aria-pressed={status === value}
            onClick={() => changeStatus(value)}
          >
            {STATUS_LABELS[value]}
          </Button>
        ))}
      </div>

      {suppliers.isPending ? (
        <div
          className="grid gap-3"
          role="status"
          aria-label="در حال دریافت تأمین‌کنندگان"
        >
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {suppliers.isError ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{suppliers.error.message}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => suppliers.refetch()}
            >
              <RefreshCw aria-hidden="true" /> تلاش دوباره
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {suppliers.data?.items.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 py-12 text-center">
            <h2 className="font-semibold">
              تأمین‌کننده‌ای در این وضعیت وجود ندارد.
            </h2>
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "برای شروع، اولین تأمین‌کننده سازمان را ثبت کنید."
                : "مالک سازمان می‌تواند تأمین‌کننده جدید ثبت کند."}
            </p>
            {isOwner ? (
              <Button asChild variant="outline">
                <Link href="/suppliers/new">ثبت تأمین‌کننده</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {suppliers.data && suppliers.data.items.length > 0 ? (
        <div className="grid gap-3">
          {suppliers.data.items.map((supplier) => (
            <Card key={supplier.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div>
                  <Link
                    className="font-semibold hover:underline"
                    href={`/suppliers/${supplier.id}`}
                  >
                    {supplier.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {supplier.id}
                  </p>
                </div>
                <SupplierStatusBadge isActive={supplier.isActive} />
              </CardContent>
            </Card>
          ))}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              صفحه قبل
            </Button>
            <span className="text-sm text-muted-foreground">
              {offset + 1} تا {Math.min(offset + limit, suppliers.data.total)}{" "}
              از {suppliers.data.total}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={offset + limit >= suppliers.data.total}
              onClick={() => setOffset(offset + limit)}
            >
              صفحه بعد
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
