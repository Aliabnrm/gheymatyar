"use client";

import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RejectionInputSchema,
  type ReviewStatus,
  useApprovePriceListVersionMutation,
  useCurrentPriceListVersionQuery,
  useRejectPriceListVersionMutation,
} from "@/services/price-list-versions";

const CONFLICT_MESSAGE =
  "وضعیت نسخه یا قیمت جاری تغییر کرده است. اطلاعات تازه دریافت شد؛ لطفاً دوباره بررسی کنید.";

function decisionError(
  error: { status: number; message: string } | null,
): string | null {
  if (!error) return null;
  if (error.status === 409) return CONFLICT_MESSAGE;
  if (error.status === 403) return "فقط مالک سازمان اجازه تصمیم‌گیری دارد.";
  return error.message;
}

export function VersionApprovalPanel({
  supplierId,
  versionId,
  reviewStatus,
  isOwner,
}: {
  supplierId: string;
  versionId: string;
  reviewStatus: ReviewStatus;
  isOwner: boolean;
}) {
  const current = useCurrentPriceListVersionQuery(supplierId);
  const approve = useApprovePriceListVersionMutation();
  const reject = useRejectPriceListVersionMutation();
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionConfirmed, setRejectionConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const pending = approve.isPending || reject.isPending;

  useEffect(() => {
    if (rejectOpen) reasonRef.current?.focus();
  }, [rejectOpen]);

  if (reviewStatus !== "READY_FOR_REVIEW") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تصمیم نهایی</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          تصمیم این نسخه نهایی است و امکان تأیید دوباره، رد دوباره یا بازگشایی
          آن وجود ندارد.
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تصمیم نهایی</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          دسترسی شما فقط برای مشاهده نسخه، تغییرات و تاریخچه تصمیم‌ها است. تأیید
          یا رد نسخه فقط توسط مالک سازمان انجام می‌شود.
        </CardContent>
      </Card>
    );
  }

  if (current.isPending) {
    return <Skeleton className="h-56 w-full" role="status" />;
  }

  if (current.isError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription>
          برای تصمیم‌گیری باید قیمت جاری دریافت شود. {current.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const errorMessage = decisionError(approve.error ?? reject.error);
  const expectedCurrentVersionId = current.data.currentVersion?.id ?? null;

  async function approveVersion(): Promise<void> {
    if (!approvalConfirmed || pending) return;
    setSuccessMessage(null);
    approve.reset();
    reject.reset();
    try {
      await approve.mutateAsync({
        supplierId,
        versionId,
        input: {
          expectedCurrentVersionId,
          confirmApproval: true,
          decisionNote: approvalNote.trim() || null,
        },
      });
      setSuccessMessage("نسخه تأیید شد و به‌عنوان قیمت جاری انتخاب شد.");
    } catch {
      // Safe mutation error is rendered below.
    }
  }

  async function rejectVersion(): Promise<void> {
    if (pending) return;
    const parsed = RejectionInputSchema.safeParse({
      confirmRejection: rejectionConfirmed,
      reason,
    });
    if (!parsed.success) {
      setReasonError(
        rejectionConfirmed
          ? (parsed.error.issues[0]?.message ?? "دلیل رد را وارد کنید.")
          : "تأیید صریح رد نسخه الزامی است.",
      );
      reasonRef.current?.focus();
      return;
    }
    setReasonError(null);
    setSuccessMessage(null);
    approve.reset();
    reject.reset();
    try {
      await reject.mutateAsync({ supplierId, versionId, input: parsed.data });
      setRejectOpen(false);
      setSuccessMessage("نسخه رد شد و قیمت جاری قبلی بدون تغییر باقی ماند.");
    } catch {
      // Safe mutation error is rendered below.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>تصمیم نهایی مالک</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Alert role="status">
          <AlertDescription>
            با تأیید این نسخه، قیمت‌های آن به‌عنوان قیمت جاری این تأمین‌کننده
            انتخاب می‌شوند. نسخه‌های تاریخی تغییر نمی‌کنند.
          </AlertDescription>
        </Alert>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={approvalConfirmed}
            disabled={pending}
            onChange={(event) => setApprovalConfirmed(event.target.checked)}
          />
          تغییرات نسخه را بررسی کردم و پیامد انتخاب آن به‌عنوان قیمت جاری را
          می‌پذیرم.
        </label>
        <label className="grid gap-2 text-sm" htmlFor="approval-note">
          یادداشت تأیید (اختیاری)
          <textarea
            id="approval-note"
            className="min-h-20 rounded-md border bg-background px-3 py-2"
            value={approvalNote}
            maxLength={500}
            disabled={pending}
            onChange={(event) => setApprovalNote(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!approvalConfirmed || pending}
            onClick={() => void approveVersion()}
          >
            {approve.isPending ? "در حال تأیید…" : "تأیید و انتخاب قیمت جاری"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            aria-expanded={rejectOpen}
            aria-controls="reject-version-panel"
            onClick={() => setRejectOpen(true)}
          >
            رد نسخه
          </Button>
        </div>
        {rejectOpen ? (
          <div
            id="reject-version-panel"
            className="grid gap-3 rounded-lg border p-4"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !pending) setRejectOpen(false);
            }}
          >
            <label className="grid gap-2 text-sm" htmlFor="rejection-reason">
              دلیل رد نسخه
              <textarea
                ref={reasonRef}
                id="rejection-reason"
                className="min-h-24 rounded-md border bg-background px-3 py-2"
                value={reason}
                maxLength={500}
                aria-invalid={Boolean(reasonError)}
                aria-describedby={
                  reasonError ? "rejection-reason-error" : undefined
                }
                disabled={pending}
                onChange={(event) => {
                  setReason(event.target.value);
                  setReasonError(null);
                }}
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={rejectionConfirmed}
                disabled={pending}
                onChange={(event) => {
                  setRejectionConfirmed(event.target.checked);
                  setReasonError(null);
                }}
              />
              رد نهایی این نسخه را تأیید می‌کنم.
            </label>
            {reasonError ? (
              <p
                id="rejection-reason-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {reasonError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => void rejectVersion()}
              >
                {reject.isPending ? "در حال رد…" : "ثبت رد نسخه"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setRejectOpen(false)}
              >
                انصراف
              </Button>
            </div>
          </div>
        ) : null}
        {errorMessage ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {successMessage ? (
          <Alert role="status">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
