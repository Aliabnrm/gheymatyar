import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatInteger } from "@/utils/format";
import type { MappingReview } from "@/services/price-list-imports/column-mapping.schema";

import { mappingFields } from "../model/column-mapping";
import type { useColumnMappingEditor } from "../hooks/use-column-mapping-editor";
type TemplateEditor = Pick<
  ReturnType<typeof useColumnMappingEditor>,
  "canSave" | "pending" | "confirmed" | "setConfirmed" | "save" | "saveTemplate"
>;
export function MappingTemplatePanel({
  review,
  editor,
}: {
  review: MappingReview;
  editor: TemplateEditor;
}) {
  const { canSave, pending, confirmed, setConfirmed, save, saveTemplate } = editor;
  return (
    <section className="grid gap-3 border-t pt-5" aria-label="الگوی تأمین‌کننده">
      <h3 className="font-medium">الگوی تأمین‌کننده</h3>
      {review.saved_template ? (
        <>
          <p className="text-sm">
            الگوی فعال: برگه «{review.saved_template.mapping.sheet_name}»، ردیف{" "}
            {formatInteger(review.saved_template.mapping.header_row)}.
          </p>
          <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            {mappingFields.map(({ field, label }) => (
              <div key={field}>
                {label}: ستون{" "}
                {review.saved_template?.mapping.columns[field]
                  ? formatInteger(review.saved_template.mapping.columns[field]!)
                  : "انتخاب نشده"}
              </div>
            ))}
          </dl>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={!canSave || pending}
            />
            جایگزینی الگوی فعال با نگاشت این اجرا را تأیید می‌کنم.
          </label>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          هنوز الگویی برای این تأمین‌کننده ذخیره نشده است.
        </p>
      )}
      {!canSave && (
        <p className="text-sm text-muted-foreground">
          ذخیره الگو از نگاشت اجرای موفق ممکن است؛ پس از اصلاح، اجرای جدید را باز کنید.
        </p>
      )}
      {save.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{save.error.message}</AlertDescription>
        </Alert>
      )}
      {save.isSuccess && <p role="status">الگوی تأمین‌کننده ذخیره شد.</p>}
      <Button
        type="button"
        variant="outline"
        disabled={!canSave || pending || (!!review.saved_template && !confirmed)}
        onClick={saveTemplate}
      >
        {save.isPending
          ? "در حال ذخیره الگو…"
          : review.saved_template
            ? "جایگزینی الگوی تأمین‌کننده"
            : "ذخیره الگوی تأمین‌کننده"}
      </Button>
    </section>
  );
}
