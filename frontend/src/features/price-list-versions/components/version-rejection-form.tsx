import { Button } from "@/components/ui/button";
import type { useVersionDecision } from "../hooks/use-version-decision";
export function VersionRejectionForm({
  decision,
}: {
  decision: ReturnType<typeof useVersionDecision>;
}) {
  const {
    rejectOpen,
    setRejectOpen,
    reasonRef,
    reason,
    setReason,
    pending,
    reasonError,
    setReasonError,
    rejectionConfirmed,
    setRejectionConfirmed,
    rejectVersion,
    reject,
  } = decision;
  return (
    <>
      {" "}
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
              aria-describedby={reasonError ? "rejection-reason-error" : undefined}
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
            <p id="rejection-reason-error" className="text-sm text-destructive" role="alert">
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
    </>
  );
}
