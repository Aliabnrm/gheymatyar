"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useCreatePriceListVersion,
  type CreateVersionContext,
} from "../hooks/use-create-price-list-version";
export function CreateVersionPanel(props: CreateVersionContext) {
  const { supplierIsActive } = props;
  const { confirmed, setConfirmed, createVersion, submit } = useCreatePriceListVersion(props);
  return (
    <Card>
      <CardHeader>
        <CardTitle>ثبت نسخه تغییرناپذیر</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Alert role="status">
          <AlertDescription>
            این نسخه پس از ساخته‌شدن قابل ویرایش نیست. ساخت نسخه به‌معنای تأیید نهایی یا جاری‌شدن
            قیمت‌ها نیست.
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
          {createVersion.isPending ? "در حال ساخت نسخه…" : "ساخت نسخه تغییرناپذیر"}
        </Button>
      </CardContent>
    </Card>
  );
}
