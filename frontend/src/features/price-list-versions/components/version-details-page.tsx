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
  type CurrentPriceImpact,
  useCurrentPriceImpactQuery,
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

interface ImpactPin {
  baselineVersionId: string | null;
  expectNoCurrent: boolean;
}

const UNPINNED_IMPACT: ImpactPin = {
  baselineVersionId: null,
  expectNoCurrent: false,
};

function pinForReport(report: CurrentPriceImpact): ImpactPin {
  return report.baselineStatus === "NO_CURRENT"
    ? { baselineVersionId: null, expectNoCurrent: true }
    : {
        baselineVersionId: report.baselineVersion?.id ?? null,
        expectNoCurrent: false,
      };
}

function reportMatchesPin(report: CurrentPriceImpact, pin: ImpactPin): boolean {
  if (report.baselineStatus === "NO_CURRENT") return pin.expectNoCurrent;
  return (
    !pin.expectNoCurrent && pin.baselineVersionId === report.baselineVersion?.id
  );
}

function approvalContextFor(report: CurrentPriceImpact) {
  const baselineId = report.baselineVersion?.id ?? null;
  return {
    key: `${report.targetVersion.id}:${report.baselineStatus}:${baselineId ?? "none"}`,
    expectedCurrentVersionId: baselineId,
    isLatest: report.isLatest,
    supplierIsActive: report.supplierIsActive,
  };
}

export function VersionDetailsPage({
  supplierId,
  versionId,
}: {
  supplierId: string;
  versionId: string;
}) {
  return (
    <VersionDetailsContent
      key={`${supplierId}:${versionId}`}
      supplierId={supplierId}
      versionId={versionId}
    />
  );
}

function VersionDetailsContent({
  supplierId,
  versionId,
}: {
  supplierId: string;
  versionId: string;
}) {
  const [changeType, setChangeType] = useState<ChangeType | null>(null);
  const [changeOffset, setChangeOffset] = useState(0);
  const [impactChangeType, setImpactChangeType] = useState<ChangeType | null>(
    null,
  );
  const [impactOffset, setImpactOffset] = useState(0);
  const changeLimit = 50;
  const impactLimit = 50;
  const account = useCurrentAccountQuery();
  const version = usePriceListVersionQuery(supplierId, versionId);
  const changes = usePriceListVersionChangesQuery(supplierId, versionId, {
    changeType,
    limit: changeLimit,
    offset: changeOffset,
  });
  const initialImpact = useCurrentPriceImpactQuery(
    supplierId,
    versionId,
    {
      ...UNPINNED_IMPACT,
      changeType: null,
      limit: 1,
      offset: 0,
    },
    version.data?.reviewStatus === "READY_FOR_REVIEW",
  );
  const impactPin = initialImpact.data
    ? pinForReport(initialImpact.data)
    : UNPINNED_IMPACT;
  const hasResolvedPin = initialImpact.data !== undefined;
  const baselineImpact = useCurrentPriceImpactQuery(
    supplierId,
    versionId,
    {
      ...impactPin,
      changeType: null,
      limit: 1,
      offset: 0,
    },
    version.data?.reviewStatus === "READY_FOR_REVIEW" && hasResolvedPin,
  );
  const impact = useCurrentPriceImpactQuery(
    supplierId,
    versionId,
    {
      ...impactPin,
      changeType: impactChangeType,
      limit: impactLimit,
      offset: impactOffset,
    },
    version.data?.reviewStatus === "READY_FOR_REVIEW" && hasResolvedPin,
  );
  const approvalContext =
    baselineImpact.data && reportMatchesPin(baselineImpact.data, impactPin)
      ? approvalContextFor(baselineImpact.data)
      : null;
  const impactError =
    initialImpact.error ?? baselineImpact.error ?? impact.error;
  const impactIsPending =
    initialImpact.isPending ||
    (hasResolvedPin && (baselineImpact.isPending || impact.isPending));

  function selectChangeType(next: ChangeType | null): void {
    setChangeType(next);
    setChangeOffset(0);
  }

  function selectImpactChangeType(next: ChangeType | null): void {
    setImpactChangeType(next);
    setImpactOffset(0);
  }

  function restartImpactReview(): void {
    setImpactOffset(0);
    void initialImpact.refetch();
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
          تغییرات نسبت به نسخه قبلی ثبت‌شده
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
            <p className="text-sm text-muted-foreground">
              مبنای تاریخی: نسخه{" "}
              {formatInteger(changes.data.baselineVersion!.versionNumber)}؛ نسخه
              هدف: {formatInteger(data.versionNumber)}. این مبنا حتی اگر نسخه
              قبلی رد شده باشد، برای حفظ تاریخچه تغییر نمی‌کند.
            </p>
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
      <section className="grid gap-4" aria-labelledby="current-impact-title">
        <h2 id="current-impact-title" className="text-xl font-semibold">
          اثر این نسخه بر قیمت جاری
        </h2>
        {data.reviewStatus !== "READY_FOR_REVIEW" ? (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">
            این گزارش زنده فقط تا پیش از تصمیم نهایی نسخه نمایش داده می‌شود.
            سابقه تصمیم در بخش رویدادهای ممیزی باقی می‌ماند.
          </p>
        ) : null}
        {data.reviewStatus === "READY_FOR_REVIEW" && impactIsPending ? (
          <Skeleton className="h-40 w-full" role="status" />
        ) : null}
        {data.reviewStatus === "READY_FOR_REVIEW" && impactError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription className="grid gap-3">
              <span>
                {impactError.status === 409
                  ? "قیمت جاری یا وضعیت نسخه تغییر کرده است. گزارش تازه را دوباره دریافت و بررسی کنید."
                  : impactError.message}
              </span>
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={restartImpactReview}
              >
                <RefreshCw aria-hidden="true" /> دریافت گزارش تازه
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {impact.data?.baselineStatus === "NO_CURRENT" ? (
          <Alert role="status">
            <AlertDescription>
              هنوز قیمت جاری تأییدشده‌ای وجود ندارد؛ این نسخه در صورت تأیید،
              اولین قیمت جاری خواهد شد. نسخه هدف: نسخه{" "}
              {formatInteger(impact.data.targetVersion.versionNumber)}.
            </AlertDescription>
          </Alert>
        ) : null}
        {impact.data?.baselineStatus === "CURRENT_BASELINE" &&
        impact.data.summary ? (
          <>
            <p className="text-sm text-muted-foreground">
              مبنای عملیاتی: قیمت جاری نسخه{" "}
              {formatInteger(impact.data.baselineVersion!.versionNumber)}؛ نسخه
              هدف: {formatInteger(impact.data.targetVersion.versionNumber)}. این
              گزارش نشان می‌دهد تأیید نسخه هدف چه اثری بر قیمت جاری دارد.
            </p>
            {changes.data?.baselineVersion?.id ===
            impact.data.baselineVersion?.id ? (
              <p className="text-sm text-muted-foreground">
                شماره مبنای دو گزارش برابر است، اما گزارش تاریخی و گزارش اثر بر
                قیمت جاری همچنان دو معنای متفاوت دارند.
              </p>
            ) : null}
            <ChangeSummaryCards summary={impact.data.summary} />
            <div
              className="flex flex-wrap gap-2"
              aria-label="فیلتر اثر بر قیمت جاری"
            >
              {CHANGE_FILTERS.map((filter) => (
                <Button
                  key={filter.value ?? "all"}
                  type="button"
                  size="sm"
                  variant={
                    impactChangeType === filter.value ? "secondary" : "outline"
                  }
                  aria-pressed={impactChangeType === filter.value}
                  onClick={() => selectImpactChangeType(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <PriceListChangeTable items={impact.data.items} />
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={impactOffset === 0}
                onClick={() =>
                  setImpactOffset(Math.max(0, impactOffset - impactLimit))
                }
              >
                صفحه قبل
              </Button>
              <span className="text-sm text-muted-foreground">
                {formatInteger(impact.data.total)} تغییر
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={impactOffset + impactLimit >= impact.data.total}
                onClick={() => setImpactOffset(impactOffset + impactLimit)}
              >
                صفحه بعد
              </Button>
            </div>
          </>
        ) : null}
      </section>
      <VersionApprovalPanel
        supplierId={supplierId}
        versionId={versionId}
        reviewStatus={data.reviewStatus}
        isOwner={account.data?.membership.role === "OWNER"}
        approvalContext={approvalContext}
        onApprovalConflict={restartImpactReview}
      />
      <section className="grid gap-4" aria-labelledby="version-items-title">
        <h2 id="version-items-title" className="text-xl font-semibold">
          کالاهای این نسخه
        </h2>
        <VersionItemsTable supplierId={supplierId} versionId={versionId} />
      </section>
      <VersionAuditTimeline supplierId={supplierId} versionId={versionId} />
    </main>
  );
}
