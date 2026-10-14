"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChangeType } from "@/services/price-list-comparison/price-list-comparison.schema";
import { useCurrentAccountQuery } from "@/services/auth";
import {
  usePriceListVersionChangesQuery,
  usePriceListVersionQuery,
} from "@/services/price-list-versions";
import { formatInteger } from "@/utils/format";

import { ChangeSummaryCards } from "./change-summary-cards";
import {
  ApprovalStatusBadge,
  CurrentVersionBadge,
} from "./approval-status-badge";
import { PriceListChangeTable } from "./price-list-change-table";
import { VersionApprovalPanel } from "./version-approval-panel";
import { VersionAuditTimeline } from "./version-audit-timeline";
import { VersionItemsTable } from "./version-items-table";
import { REVIEW_STATUS_DESCRIPTIONS } from "../model/approval-labels";
import { CHANGE_FILTERS } from "../model/change-type-labels";
import { formatVersionDate } from "../model/version-formatters";

export function VersionDetailsPage({
  supplierId,
  versionId,
}: {
  supplierId: string;
  versionId: string;
}) {
  const [changeType, setChangeType] = useState<ChangeType | null>(null);
  const [changeOffset, setChangeOffset] = useState(0);
  const changeLimit = 50;
  const account = useCurrentAccountQuery();
  const version = usePriceListVersionQuery(supplierId, versionId);
  const changes = usePriceListVersionChangesQuery(supplierId, versionId, {
    changeType,
    limit: changeLimit,
    offset: changeOffset,
  });

  function selectChangeType(next: ChangeType | null): void {
    setChangeType(next);
    setChangeOffset(0);
  }

  if (version.isPending) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-10" role="status">
        <Skeleton className="h-80 w-full" />
      </main>
    );
  }
  if (version.isError) {
    return (
      <main className="mx-auto grid max-w-3xl gap-4 px-5 py-10">
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {version.error.status === 404
              ? "نسخه قیمت موردنظر پیدا نشد."
              : version.error.message}
          </AlertDescription>
        </Alert>
        {version.error.status !== 404 ? (
          <Button type="button" onClick={() => version.refetch()}>
            <RefreshCw aria-hidden="true" /> تلاش دوباره
          </Button>
        ) : null}
      </main>
    );
  }

  const data = version.data;
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">نسخه تغییرناپذیر قیمت</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">
              نسخه {formatInteger(data.versionNumber)}
            </h1>
            <ApprovalStatusBadge status={data.reviewStatus} />
            {data.isCurrent ? <CurrentVersionBadge /> : null}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/suppliers/${supplierId}`}>
            <ArrowRight aria-hidden="true" /> بازگشت به تأمین‌کننده
          </Link>
        </Button>
      </div>
      <Alert role="status">
        <AlertDescription>
          {REVIEW_STATUS_DESCRIPTIONS[data.reviewStatus]}
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>مشخصات نسخه</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">تعداد کالا</dt>
              <dd>{formatInteger(data.rowCount)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">زمان ثبت</dt>
              <dd>{formatVersionDate(data.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ثبت‌کننده</dt>
              <dd dir="ltr">{data.createdByEmail}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">وضعیت بررسی</dt>
              <dd>
                <ApprovalStatusBadge status={data.reviewStatus} />
              </dd>
            </div>
            {data.decidedAt ? (
              <div>
                <dt className="text-muted-foreground">زمان تصمیم</dt>
                <dd>{formatVersionDate(data.decidedAt)}</dd>
              </div>
            ) : null}
            {data.decidedByEmail ? (
              <div>
                <dt className="text-muted-foreground">تصمیم‌گیرنده</dt>
                <dd dir="ltr">{data.decidedByEmail}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Import منبع</dt>
              <dd>
                <Link
                  className="underline"
                  href={`/suppliers/${supplierId}/imports/${data.sourceImportId}`}
                >
                  مشاهده Import
                </Link>
              </dd>
            </div>
            {data.decisionNote ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-muted-foreground">یادداشت تصمیم</dt>
                <dd>{data.decisionNote}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>
      <section className="grid gap-4" aria-labelledby="version-changes-title">
        <h2 id="version-changes-title" className="text-xl font-semibold">
          تغییرات نسبت به نسخه قبلی
        </h2>
        {changes.isPending ? <Skeleton className="h-40 w-full" /> : null}
        {changes.isError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{changes.error.message}</AlertDescription>
          </Alert>
        ) : null}
        {changes.data && !changes.data.baselineVersion ? (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">
            این اولین نسخه ثبت‌شده است و نسخه قبلی برای مقایسه ندارد.
          </p>
        ) : null}
        {changes.data?.summary ? (
          <>
            <ChangeSummaryCards summary={changes.data.summary} />
            <div
              className="flex flex-wrap gap-2"
              aria-label="فیلتر تغییرات نسخه"
            >
              {CHANGE_FILTERS.map((filter) => (
                <Button
                  key={filter.value ?? "all"}
                  type="button"
                  size="sm"
                  variant={
                    changeType === filter.value ? "secondary" : "outline"
                  }
                  aria-pressed={changeType === filter.value}
                  onClick={() => selectChangeType(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <PriceListChangeTable items={changes.data.items} />
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={changeOffset === 0}
                onClick={() =>
                  setChangeOffset(Math.max(0, changeOffset - changeLimit))
                }
              >
                صفحه قبل
              </Button>
              <span className="text-sm text-muted-foreground">
                {formatInteger(changes.data.total)} تغییر
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={changeOffset + changeLimit >= changes.data.total}
                onClick={() => setChangeOffset(changeOffset + changeLimit)}
              >
                صفحه بعد
              </Button>
            </div>
          </>
        ) : null}
      </section>
      <section className="grid gap-4" aria-labelledby="version-items-title">
        <h2 id="version-items-title" className="text-xl font-semibold">
          کالاهای این نسخه
        </h2>
        <VersionItemsTable supplierId={supplierId} versionId={versionId} />
      </section>
      <VersionApprovalPanel
        supplierId={supplierId}
        versionId={versionId}
        reviewStatus={data.reviewStatus}
        isOwner={account.data?.membership.role === "OWNER"}
      />
      <VersionAuditTimeline supplierId={supplierId} versionId={versionId} />
    </main>
  );
}
