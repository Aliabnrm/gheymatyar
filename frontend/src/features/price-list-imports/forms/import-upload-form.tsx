"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";

import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  PriceListImportUploadInputSchema,
  useUploadPriceListImportMutation,
  type PriceListImport,
  type PriceListImportUploadFormInput,
} from "@/services/price-list-imports";

import {
  getExistingImportId,
  getImportErrorMessage,
} from "../model/import-error-message";

export function ImportUploadForm({
  supplierId,
  onCompleted,
}: {
  supplierId: string;
  onCompleted: (priceListImport: PriceListImport) => void;
}) {
  const upload = useUploadPriceListImportMutation();
  const errorRef = useRef<HTMLDivElement>(null);
  const form = useForm<PriceListImportUploadFormInput>({
    resolver: zodResolver(PriceListImportUploadInputSchema),
  });
  const isPending = form.formState.isSubmitting || upload.isPending;

  useEffect(() => {
    if (upload.error) errorRef.current?.focus();
  }, [upload.error]);

  async function submit(input: PriceListImportUploadFormInput): Promise<void> {
    upload.reset();
    try {
      const result = await upload.mutateAsync({ supplierId, input });
      onCompleted(result);
    } catch {
      // The mutation error is rendered and focused by the effect above.
    }
  }

  const existingImportId = upload.error
    ? getExistingImportId(upload.error)
    : null;

  return (
    <form
      className="grid gap-6"
      noValidate
      aria-busy={isPending}
      onSubmit={form.handleSubmit(submit)}
    >
      <Controller
        control={form.control}
        name="file"
        render={({ field: { name, onBlur, onChange, ref }, fieldState }) => {
          const descriptionId = "import-file-description";
          const errorId = "import-file-error";
          return (
            <Field data-invalid={fieldState.invalid} data-disabled={isPending}>
              <FieldLabel htmlFor="import-file">فایل لیست قیمت</FieldLabel>
              <Input
                ref={ref}
                id="import-file"
                name={name}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={isPending}
                aria-invalid={fieldState.invalid || undefined}
                aria-describedby={`${descriptionId}${fieldState.error ? ` ${errorId}` : ""}`}
                className="h-auto cursor-pointer bg-background py-2 file:ms-0 file:me-3"
                onBlur={onBlur}
                onChange={(event) => onChange(event.target.files?.[0])}
              />
              <FieldDescription id={descriptionId}>
                فقط XLSX تا سقف ۱۰ مگابایت؛ فایل اصلی برای بازبینی و تاریخچه
                نگهداری می‌شود.
              </FieldDescription>
              <FieldError id={errorId} errors={[fieldState.error]} />
            </Field>
          );
        }}
      />

      {upload.error ? (
        <Alert ref={errorRef} tabIndex={-1} variant="destructive" role="alert">
          <FileSpreadsheet aria-hidden="true" />
          <AlertDescription>
            <p>{getImportErrorMessage(upload.error)}</p>
            {existingImportId ? (
              <Button asChild variant="link" className="h-auto p-0">
                <Link
                  href={`/suppliers/${supplierId}/imports/${encodeURIComponent(existingImportId)}`}
                >
                  مشاهده Import قبلی
                </Link>
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending}>
        <AsyncButtonContent
          isPending={isPending}
          idleLabel="بارگذاری و استخراج فایل"
          pendingLabel="در حال بارگذاری و استخراج…"
        />
      </Button>
    </form>
  );
}
