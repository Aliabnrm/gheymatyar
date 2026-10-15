import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { MappingReview } from "@/services/price-list-imports/column-mapping.schema";

import Link from "next/link";
import type { PriceListImportStatus } from "@/services/price-list-imports";
import { mappingOrigins } from "../model/column-mapping";
import { useColumnMappingEditor } from "../hooks/use-column-mapping-editor";
import { MappingSourceForm } from "./mapping-source-form";
import { MappingColumnFields } from "./mapping-column-fields";
import { MappingPreviewTable } from "./mapping-preview-table";
import { MappingIssuesList } from "./mapping-issues-list";
import { MappingTemplatePanel } from "./mapping-template-panel";
export function ColumnMappingEditor(props: {
  supplierId: string;
  importId: string;
  status: PriceListImportStatus;
  review: MappingReview;
  onPreview: (selection: { sheet_name: string; header_row: number }) => void;
}) {
  const { supplierId, review, onPreview } = props;
  const editor = useColumnMappingEditor(props);
  const { snapshot, mapping, pending, selectionChanged, issues, rerun } = editor;
  return (
    <>
      <p className="text-sm">
        منبع نگاشت: <strong>{mappingOrigins[snapshot.origin]}</strong>
      </p>
      {!review.historical_snapshot && (
        <p className="text-sm text-muted-foreground">
          این پیش‌نمایش پیشنهاد تازه است؛ اطلاعات اجرای قبلی تغییر نکرده است.
        </p>
      )}
      {snapshot.template_id && (
        <p className="break-all text-xs text-muted-foreground">
          شناسه الگوی استفاده‌شده: <bdi>{snapshot.template_id}</bdi>
        </p>
      )}
      {!review.can_edit && (
        <Alert>
          <AlertDescription>
            تأمین‌کننده غیرفعال است؛ این اطلاعات فقط قابل مشاهده است.
          </AlertDescription>
        </Alert>
      )}

      <MappingSourceForm editor={editor} onPreview={onPreview} />
      <MappingColumnFields
        mapping={mapping}
        snapshot={snapshot}
        disabled={!review.can_edit || pending || selectionChanged}
        onChange={editor.changeColumn}
      />
      <p className="text-xs text-muted-foreground">
        * الزامی · مبلغ فقط عدد صحیح مثبت به ریال است. تومان پذیرفته نمی‌شود.
      </p>
      {issues.length > 0 && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{issues.join(" ")}</AlertDescription>
        </Alert>
      )}
      <MappingPreviewTable snapshot={snapshot} />
      <MappingIssuesList snapshot={snapshot} />
      {rerun.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{rerun.error.message}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        disabled={!review.can_edit || pending || selectionChanged || issues.length > 0}
        onClick={() => rerun.mutate(mapping)}
      >
        {rerun.isPending ? "در حال استخراج…" : "اجرای جدید با این نگاشت"}
      </Button>
      {rerun.data && (
        <Alert role="status">
          <AlertDescription className="grid gap-2">
            {rerun.data.status === "DRAFT"
              ? "اجرای جدید بدون خطا و آماده بازبینی ساخته شد."
              : "اجرای جدید ثبت شد، اما هنوز خطای داده دارد."}
            <Link
              className="font-medium underline"
              href={`/suppliers/${supplierId}/imports/${rerun.data.id}`}
            >
              مشاهده اجرای جدید و ذخیره الگوی آن
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <MappingTemplatePanel review={review} editor={editor} />
    </>
  );
}
