"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVersionDecision } from "../hooks/use-version-decision";
import type { VersionApprovalProps } from "../model/version-decision";
import { VersionRejectionForm } from "./version-rejection-form";
export function VersionApprovalPanel(props: VersionApprovalProps) {
  const { reviewStatus, isOwner } = props;
  const decision = useVersionDecision(props);
  const {
    approve,
    pending,
    errorMessage,
    approvalBlockedMessage,
    canApprove,
    approvalConfirmed,
    setApprovalConfirmed,
    approvalNote,
    setApprovalNote,
    rejectOpen,
    setRejectOpen,
    successMessage,
    approveVersion,
  } = decision;
  if (reviewStatus !== "READY_FOR_REVIEW") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تصمیم نهایی</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          تصمیم این نسخه نهایی است و امکان تأیید دوباره، رد دوباره یا بازگشایی آن وجود ندارد.
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
          دسترسی شما فقط برای مشاهده نسخه، تغییرات و تاریخچه تصمیم‌ها است. تأیید یا رد نسخه فقط توسط
          مالک سازمان انجام می‌شود.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>تصمیم نهایی مالک</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Alert role="status">
          <AlertDescription>
            با تأیید این نسخه، قیمت‌های آن به‌عنوان قیمت جاری این تأمین‌کننده انتخاب می‌شوند.
            نسخه‌های تاریخی تغییر نمی‌کنند.
          </AlertDescription>
        </Alert>
        {approvalBlockedMessage ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{approvalBlockedMessage}</AlertDescription>
          </Alert>
        ) : null}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={approvalConfirmed}
            disabled={pending || !canApprove}
            onChange={(event) => setApprovalConfirmed(event.target.checked)}
          />
          تغییرات نسخه را بررسی کردم و پیامد انتخاب آن به‌عنوان قیمت جاری را می‌پذیرم.
        </label>
        <label className="grid gap-2 text-sm" htmlFor="approval-note">
          یادداشت تأیید (اختیاری)
          <textarea
            id="approval-note"
            className="min-h-20 rounded-md border bg-background px-3 py-2"
            value={approvalNote}
            maxLength={500}
            disabled={pending || !canApprove}
            onChange={(event) => setApprovalNote(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!approvalConfirmed || pending || !canApprove}
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
        <VersionRejectionForm decision={decision} />
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
