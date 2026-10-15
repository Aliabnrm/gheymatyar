"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PaginationControls } from "@/components/shared/pagination-controls";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePriceListVersionsQuery } from "@/services/price-list-versions";
import { formatInteger } from "@/utils/format";

import { ApprovalStatusBadge, CurrentVersionBadge } from "./approval-status-badge";
import { formatVersionDate } from "../model/version-formatters";

export function VersionHistory({ supplierId }: { supplierId: string }) {
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const versions = usePriceListVersionsQuery(supplierId, { limit, offset });

  return (
    <section className="grid gap-4" aria-labelledby="version-history-title">
      <div>
        <h2 id="version-history-title" className="text-xl font-semibold">
          نسخه‌های ثبت‌شده قیمت
        </h2>
        <p className="text-sm text-muted-foreground">
          هر نسخه تغییرناپذیر است و وضعیت بررسی و جاری‌بودن آن جداگانه نمایش داده می‌شود.
        </p>
      </div>
      {versions.isPending ? <Skeleton className="h-32 w-full" role="status" /> : null}
      {versions.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{versions.error.message}</span>
            <Button type="button" size="sm" onClick={() => versions.refetch()}>
              <RefreshCw aria-hidden="true" /> تلاش دوباره
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {versions.data?.items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            هنوز نسخه‌ای ثبت نشده است. پس از بازبینی یک Import معتبر، اولین نسخه را بسازید.
          </CardContent>
        </Card>
      ) : null}
      {versions.data?.items.map((version) => (
        <Card key={version.id}>
          <CardHeader className="gap-2 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">
                  <Link
                    className="hover:underline"
                    href={`/suppliers/${supplierId}/price-list-versions/${version.id}`}
                  >
                    نسخه {formatInteger(version.versionNumber)}
                  </Link>
                </CardTitle>
                <ApprovalStatusBadge status={version.reviewStatus} />
                {version.isCurrent ? <CurrentVersionBadge /> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatVersionDate(version.createdAt)} · {formatInteger(version.rowCount)} کالا
              </p>
              {version.decidedAt && version.decidedByEmail ? (
                <p className="text-xs text-muted-foreground">
                  تصمیم در {formatVersionDate(version.decidedAt)} توسط{" "}
                  <span dir="ltr">{version.decidedByEmail}</span>
                </p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground" dir="ltr">
              {version.createdByEmail}
            </p>
          </CardHeader>
        </Card>
      ))}
      {versions.data && (versions.data.total > limit || offset > 0) ? (
        <PaginationControls
          offset={offset}
          limit={limit}
          total={versions.data.total}
          onOffsetChange={setOffset}
        >
          {formatInteger(versions.data.total)} نسخه
        </PaginationControls>
      ) : null}
    </section>
  );
}
