"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreatePriceListVersionMutation } from "@/services/price-list-versions";

export function CreateVersionPanel({
  supplierId,
  importId,
  expectedPreviousVersionId,
  supplierIsActive,
}: {
  supplierId: string;
  importId: string;
  expectedPreviousVersionId: string | null;
  supplierIsActive: boolean;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const createVersion = useCreatePriceListVersionMutation();

  async function submit(): Promise<void> {
    if (!confirmed || createVersion.isPending) return;
    try {
      const version = await createVersion.mutateAsync({
        supplierId,
        importId,
        input: {
          expectedPreviousVersionId,
          confirmCreate: true,
        },
      });
      router.push(`/suppliers/${supplierId}/price-list-versions/${version.id}`);
    } catch {
      // Mutation state renders the safe API error below.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ثبت نسخه تغییرناپذیر</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Alert role="status">
          <AlertDescription>
            این نسخه پس از ساخته‌شدن قابل ویرایش نیست. ساخت نسخه به‌معنای تأیید
            نهایی یا جاری‌شدن قیمت‌ها نیست.
          </AlertDescription>
        </Alert>
        {!supplierIsActive ? (
          <p className="text-sm text-muted-foreground">
            تأمین‌کننده غیرفعال است و نسخه جدید ساخته نمی‌شود.
          </p>
        ) : (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            پیامد تغییرناپذیر بودن این نسخه را خواندم و تأیید می‌کنم.
          </label>
        )}
        {createVersion.isError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              {createVersion.error.code === "PRICE_LIST_BASELINE_CHANGED"
                ? "در فاصله بازبینی شما نسخه جدیدی ثبت شده است. مقایسه تازه شد؛ لطفاً تغییرات را دوباره بررسی کنید."
                : createVersion.error.message}
            </AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="button"
          disabled={!supplierIsActive || !confirmed || createVersion.isPending}
          onClick={() => void submit()}
        >
          {createVersion.isPending
            ? "در حال ساخت نسخه…"
            : "ساخت نسخه تغییرناپذیر"}
        </Button>
      </CardContent>
    </Card>
  );
}
