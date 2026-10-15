"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { PaginationControls } from "@/components/shared/pagination-controls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePriceListVersionAuditEventsQuery } from "@/services/price-list-versions";
import { formatInteger } from "@/utils/format";

import { AUDIT_ACTION_LABELS } from "../model/approval-labels";
import { formatVersionDate } from "../model/version-formatters";

function decisionNote(details: Readonly<Record<string, unknown>>): string | null {
  return typeof details.decision_note === "string" ? details.decision_note : null;
}

export function VersionAuditTimeline({
  supplierId,
  versionId,
}: {
  supplierId: string;
  versionId: string;
}) {
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const audit = usePriceListVersionAuditEventsQuery(supplierId, versionId, {
    limit,
    offset,
  });

  return (
    <section className="grid gap-4" aria-labelledby="version-audit-title">
      <div>
        <h2 id="version-audit-title" className="text-xl font-semibold">
          رویدادهای تصمیم‌گیری
        </h2>
        <p className="text-sm text-muted-foreground">
          این تاریخچه فقط ثبت می‌شود و امکان ویرایش یا حذف از رابط کاربری ندارد.
        </p>
      </div>
      {audit.isPending ? <Skeleton className="h-28 w-full" role="status" /> : null}
      {audit.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{audit.error.message}</span>
            <Button type="button" size="sm" onClick={() => audit.refetch()}>
              <RefreshCw aria-hidden="true" /> تلاش دوباره
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {audit.data?.items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            هنوز تصمیمی برای این نسخه ثبت نشده است.
          </CardContent>
        </Card>
      ) : null}
      {audit.data?.items.length ? (
        <ol className="grid gap-3" aria-label="تاریخچه تصمیم‌های نسخه">
          {audit.data.items.map((event) => {
            const note = decisionNote(event.details);
            return (
              <li key={event.id} className="rounded-lg border p-4">
                <p className="font-medium">{AUDIT_ACTION_LABELS[event.action]}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatVersionDate(event.occurredAt)} · <span dir="ltr">{event.actorEmail}</span>
                </p>
                {note ? <p className="mt-3 text-sm">{note}</p> : null}
              </li>
            );
          })}
        </ol>
      ) : null}
      {audit.data && (audit.data.total > limit || offset > 0) ? (
        <PaginationControls
          offset={offset}
          limit={limit}
          total={audit.data.total}
          onOffsetChange={setOffset}
        >
          {formatInteger(audit.data.total)} رویداد
        </PaginationControls>
      ) : null}
    </section>
  );
}
