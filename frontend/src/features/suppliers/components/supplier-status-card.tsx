import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Supplier } from "@/services/suppliers";
import { formatDateTime } from "@/utils/format";
import { SupplierStatusActions } from "./supplier-status-actions";
import { SupplierStatusBadge } from "./supplier-status-badge";
import type { useSupplierEditor } from "../hooks/use-supplier-editor";
export function SupplierStatusCard({
  data,
  isOwner,
  editor,
}: {
  data: Supplier;
  isOwner: boolean;
  editor: ReturnType<typeof useSupplierEditor>;
}) {
  const update = editor.status;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>وضعیت تأمین‌کننده</CardTitle>
        <SupplierStatusBadge isActive={data.isActive} />
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <p>
          <span className="text-muted-foreground">شناسه: </span>
          <span dir="ltr">{data.id}</span>
        </p>
        <p>
          <span className="text-muted-foreground">آخرین تغییر: </span>
          {formatDateTime(data.updatedAt)}
        </p>
        {update.error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{update.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <SupplierStatusActions isActive={data.isActive} isOwner={isOwner} editor={editor} />
      </CardContent>
    </Card>
  );
}
