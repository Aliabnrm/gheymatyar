"use client";
import { useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useMappingReviewQuery,
  useRerunImportMutation,
  useSaveMappingTemplateMutation,
} from "@/services/price-list-imports/column-mapping.hooks";
import type { MappingReview } from "@/services/price-list-imports/column-mapping.schema";
import { formatInteger } from "@/utils/format";
import {
  canSaveTemplate,
  fieldLabels,
  initialMapping,
  mappingFields,
  mappingOrigins,
  mappingValidation,
  updateColumn,
} from "../model/column-mapping";

interface PanelProps {
  supplierId: string;
  importId: string;
  status: string;
}
const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";

export function ColumnMappingPanel(props: PanelProps) {
  const [selection, setSelection] = useState<{
    sheet_name: string;
    header_row: number;
  }>();
  const query = useMappingReviewQuery(
    props.supplierId,
    props.importId,
    selection,
  );
  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle>نگاشت ستون‌ها</CardTitle>
        <CardDescription>
          عنوان‌ها و چند ردیف فایل را بررسی کنید. اصلاح نگاشت یک اجرای جدید و
          قابل بازبینی می‌سازد.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {query.isPending ? (
          <p role="status">در حال دریافت نگاشت…</p>
        ) : query.isError ? (
          <>
            <Alert variant="destructive" role="alert">
              <AlertDescription>{query.error.message}</AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              onClick={() => query.refetch()}
            >
              تلاش دوباره برای دریافت نگاشت
            </Button>
            {selection && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelection(undefined)}
              >
                بازگشت به نگاشت ثبت‌شده
              </Button>
            )}
          </>
        ) : (
          <MappingEditor
            key={JSON.stringify([selection, query.data.inspection])}
            {...props}
            review={query.data}
            onPreview={setSelection}
          />
        )}
      </CardContent>
    </Card>
  );
}
function MappingEditor({
  supplierId,
  importId,
  status,
  review,
  onPreview,
}: PanelProps & {
  review: MappingReview;
  onPreview: (selection: { sheet_name: string; header_row: number }) => void;
}) {
  const [mapping, setMapping] = useState(() => initialMapping(review));
  const [sheet, setSheet] = useState(mapping.sheet_name);
  const [header, setHeader] = useState(String(mapping.header_row));
  const [confirmed, setConfirmed] = useState(false);
  const [changed, setChanged] = useState(false);
  const rerun = useRerunImportMutation(supplierId, importId);
  const save = useSaveMappingTemplateMutation(supplierId);
  const issues = mappingValidation(mapping);
  const pending = rerun.isPending || save.isPending;
  const selectionChanged =
    sheet !== mapping.sheet_name || header !== String(mapping.header_row);
  const canSave = canSaveTemplate(review, status, changed || selectionChanged);
  const snapshot = review.inspection;
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
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          onPreview({ sheet_name: sheet, header_row: Number(header) });
        }}
      >
        <label className="grid gap-2 text-sm">
          برگه فایل
          <select
            className={selectClass}
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            disabled={pending}
          >
            {snapshot.sheets.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          شماره ردیف عنوان
          <Input
            type="number"
            min={1}
            max={50020}
            required
            value={header}
            onChange={(e) => setHeader(e.target.value)}
            disabled={pending}
          />
        </label>
        <Button
          type="submit"
          variant="outline"
          className="self-end"
          disabled={pending}
        >
          نمایش عنوان و پیش‌نمایش
        </Button>
      </form>
      {selectionChanged && (
        <p role="status">
          برای ویرایش ستون‌ها، ابتدا عنوان و پیش‌نمایش جدید را نمایش دهید.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mappingFields.map(({ field, label, required }) => (
          <label key={field} className="grid gap-2 text-sm">
            {label}
            {required ? " *" : ""}
            <select
              className={selectClass}
              value={mapping.columns[field] ?? ""}
              disabled={!review.can_edit || pending || selectionChanged}
              onChange={(e) => {
                setMapping(updateColumn(mapping, field, e.target.value));
                setChanged(true);
              }}
              aria-required={required}
              aria-invalid={required && !mapping.columns[field]}
            >
              <option value="">انتخاب نشده</option>
              {snapshot.columns.map((column) => (
                <option key={column.index} value={column.index}>
                  {formatInteger(column.index)} — {column.label || "بدون عنوان"}
                </option>
              ))}
            </select>
            {snapshot.ambiguous_fields[field] && (
              <span className="text-xs text-destructive">
                چند ستون کاندید تشخیص داده شد؛ انتخاب را بازبینی کنید.
              </span>
            )}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        * الزامی · مبلغ فقط عدد صحیح مثبت به ریال است. تومان پذیرفته نمی‌شود.
      </p>
      {issues.length > 0 && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{issues.join(" ")}</AlertDescription>
        </Alert>
      )}
      <section aria-label="پیش‌نمایش فایل" className="grid gap-3">
        <h3 className="font-medium">پیش‌نمایش محدود فایل</h3>
        <p className="text-xs text-muted-foreground">
          حداکثر پنج ردیف و ۲۰۰ نویسه از هر سلول؛ فایل اصلی کامل نگهداری می‌شود.
        </p>
        {snapshot.preview.length === 0 ? (
          <p>ردیفی برای پیش‌نمایش وجود ندارد.</p>
        ) : (
          <div
            className="overflow-x-auto rounded-md border"
            tabIndex={0}
            role="region"
            aria-label="جدول پیش‌نمایش قابل پیمایش"
          >
            <table className="w-full text-sm" aria-label="پیش‌نمایش محدود فایل">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="p-3 text-start">
                    ردیف فایل
                  </th>
                  {snapshot.columns.map((column) => (
                    <th
                      scope="col"
                      key={column.index}
                      className="min-w-28 p-3 text-start"
                    >
                      {formatInteger(column.index)} —{" "}
                      {column.label || "بدون عنوان"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.preview.map((row) => (
                  <tr className="border-t" key={row.source_row_number}>
                    <th scope="row" className="p-3 text-start">
                      {formatInteger(row.source_row_number)}
                    </th>
                    {snapshot.columns.map((column) => (
                      <td
                        className="max-w-64 break-words p-3"
                        key={column.index}
                      >
                        <bdi>{row.values[column.index - 1] || "—"}</bdi>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {snapshot.issues.length > 0 && (
        <section className="grid gap-2" aria-label="خطاهای داده">
          <h3 className="font-medium text-destructive">
            خطاهای مسدودکننده ({formatInteger(snapshot.total_errors)})
          </h3>
          <ul className="grid max-h-80 gap-2 overflow-y-auto text-sm">
            {snapshot.issues.map((issue, index) => (
              <li
                className="rounded border border-destructive/30 p-3"
                key={index}
              >
                {issue.row ? `ردیف ${formatInteger(issue.row)} · ` : ""}
                {issue.field ? `${fieldLabels[issue.field]} · ` : ""}
                <bdi className="font-mono text-xs">{issue.code}</bdi>
                <p>{issue.message}</p>
              </li>
            ))}
          </ul>
          {snapshot.errors_truncated && (
            <p>
              فقط صد خطای نخست نمایش داده شده‌اند؛ هیچ ردیف ناقصی ذخیره نشده
              است.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            اگر ستون درست انتخاب شده اما مقدار آن خطا دارد، فایل Excel را اصلاح
            و به‌عنوان فایل تازه بارگذاری کنید.
          </p>
        </section>
      )}
      {rerun.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{rerun.error.message}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        disabled={
          !review.can_edit || pending || selectionChanged || issues.length > 0
        }
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
      <section
        className="grid gap-3 border-t pt-5"
        aria-label="الگوی تأمین‌کننده"
      >
        <h3 className="font-medium">الگوی تأمین‌کننده</h3>
        {review.saved_template ? (
          <>
            <p className="text-sm">
              الگوی فعال: برگه «{review.saved_template.mapping.sheet_name}»،
              ردیف {formatInteger(review.saved_template.mapping.header_row)}.
            </p>
            <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              {mappingFields.map(({ field, label }) => (
                <div key={field}>
                  {label}: ستون{" "}
                  {review.saved_template?.mapping.columns[field]
                    ? formatInteger(
                        review.saved_template.mapping.columns[field]!,
                      )
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
            ذخیره الگو از نگاشت اجرای موفق ممکن است؛ پس از اصلاح، اجرای جدید را
            باز کنید.
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
          disabled={
            !canSave || pending || (!!review.saved_template && !confirmed)
          }
          onClick={() =>
            save.mutate(
              {
                source_import_id: importId,
                expected_template_id: review.saved_template?.id ?? null,
                confirm_replace: confirmed,
              },
              {
                onSuccess: () => setConfirmed(false),
                onError: () => setConfirmed(false),
              },
            )
          }
        >
          {save.isPending
            ? "در حال ذخیره الگو…"
            : review.saved_template
              ? "جایگزینی الگوی تأمین‌کننده"
              : "ذخیره الگوی تأمین‌کننده"}
        </Button>
      </section>
    </>
  );
}
