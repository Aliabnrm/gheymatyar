"use client";
import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInteger } from "@/utils/format";

import { Button } from "@/components/ui/button";
import { useCurrentAccountQuery } from "@/services/auth";
import { usePriceListVersionQuery } from "@/services/price-list-versions";
import { useCurrentPriceImpactReview } from "../hooks/use-current-price-impact-review";
import { ApprovalStatusBadge, CurrentVersionBadge } from "./approval-status-badge";
import { VersionMetadataCard } from "./version-metadata-card";
import { HistoricalVersionChanges } from "./historical-version-changes";
import { CurrentPriceImpactSection } from "./current-price-impact-section";
import { VersionApprovalPanel } from "./version-approval-panel";
import { VersionAuditTimeline } from "./version-audit-timeline";
import { VersionItemsTable } from "./version-items-table";
import { REVIEW_STATUS_DESCRIPTIONS } from "../model/approval-labels";
export function VersionDetailsPage(props: { supplierId: string; versionId: string }) {
  return <VersionDetailsContent key={props.supplierId + ":" + props.versionId} {...props} />;
}
function VersionDetailsContent({
  supplierId,
  versionId,
}: {
  supplierId: string;
  versionId: string;
}) {
  const account = useCurrentAccountQuery();
  const version = usePriceListVersionQuery(supplierId, versionId);
  const review = useCurrentPriceImpactReview(
    supplierId,
    versionId,
    version.data?.reviewStatus,
    () => version.refetch(),
  );
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
            {version.error.status === 404 ? "نسخه قیمت موردنظر پیدا نشد." : version.error.message}
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
            <h1 className="text-2xl font-bold">نسخه {formatInteger(data.versionNumber)}</h1>
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
        <AlertDescription>{REVIEW_STATUS_DESCRIPTIONS[data.reviewStatus]}</AlertDescription>
      </Alert>

      <VersionMetadataCard data={data} supplierId={supplierId} />
      <HistoricalVersionChanges
        supplierId={supplierId}
        versionId={versionId}
        versionNumber={data.versionNumber}
      />
      <CurrentPriceImpactSection review={review} historicalBaselineId={data.previousVersionId} />
      <VersionApprovalPanel
        supplierId={supplierId}
        versionId={versionId}
        reviewStatus={data.reviewStatus}
        isOwner={account.data?.membership.role === "OWNER"}
        approvalContext={review.approvalContext}
        onApprovalConflict={review.restart}
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
