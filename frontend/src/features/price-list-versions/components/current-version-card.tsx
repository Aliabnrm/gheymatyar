"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentPriceListVersionQuery } from "@/services/price-list-versions";
import { formatInteger } from "@/utils/format";

import { ApprovalStatusBadge, CurrentVersionBadge } from "./approval-status-badge";
import { formatVersionDate } from "../model/version-formatters";

export function CurrentVersionCard({ supplierId }: { supplierId: string }) {
  const current = useCurrentPriceListVersionQuery(supplierId);

  if (current.isPending) {
    return <Skeleton className="h-40 w-full" role="status" />;
  }

  if (current.isError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{current.error.message}</span>
          <Button type="button" size="sm" onClick={() => current.refetch()}>
            <RefreshCw aria-hidden="true" /> تلاش دوباره
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const version = current.data.currentVersion;
  return (
    <Card>
      <CardHeader>
        <CardTitle>قیمت جاری تأمین‌کننده</CardTitle>
      </CardHeader>
      <CardContent>
        {!version ? (
          <p className="text-sm text-muted-foreground">
            هنوز هیچ نسخه‌ای پس از بازبینی تأیید نشده است؛ قیمت جاری وجود ندارد.
          </p>
        ) : (
          <div className="grid gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="font-semibold underline"
                href={`/suppliers/${supplierId}/price-list-versions/${version.id}`}
              >
                نسخه {formatInteger(version.versionNumber)}
              </Link>
              <ApprovalStatusBadge status={version.reviewStatus} />
              <CurrentVersionBadge />
            </div>
            <p className="text-muted-foreground">
              {formatInteger(version.rowCount)} کالا · تصمیم در{" "}
              {version.decidedAt ? formatVersionDate(version.decidedAt) : "زمان نامشخص"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
