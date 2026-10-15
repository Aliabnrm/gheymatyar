import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PriceListVersion } from "@/services/price-list-versions";
import { formatInteger } from "@/utils/format";
import { ApprovalStatusBadge } from "./approval-status-badge";
import { formatVersionDate } from "../model/version-formatters";
export function VersionMetadataCard({
  data,
  supplierId,
}: {
  data: PriceListVersion;
  supplierId: string;
}) {
  return (
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
  );
}
