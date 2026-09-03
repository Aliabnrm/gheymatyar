"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { ControlledInputField } from "@/components/shared/forms/controlled-input-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  SupplierNameInputSchema,
  type SupplierNameFormInput,
  type SupplierNameInput,
} from "@/services/suppliers";

export function SupplierNameForm({
  initialName = "",
  submitLabel,
  pendingLabel,
  isPending,
  error,
  onSubmit,
}: {
  initialName?: string;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  error: Error | null;
  onSubmit: (input: SupplierNameInput) => Promise<void>;
}) {
  const errorRef = useRef<HTMLDivElement>(null);
  const form = useForm<SupplierNameFormInput, unknown, SupplierNameInput>({
    resolver: zodResolver(SupplierNameInputSchema),
    defaultValues: { name: initialName },
    mode: "onSubmit",
  });
  const submitting = form.formState.isSubmitting || isPending;

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  return (
    <form
      className="grid gap-5"
      noValidate
      aria-busy={submitting}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {error ? (
        <Alert ref={errorRef} tabIndex={-1} role="alert" variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
      <ControlledInputField
        control={form.control}
        name="name"
        label="نام تأمین‌کننده"
        type="text"
        autoComplete="organization"
        maxLength={120}
        disabled={submitting}
        description="این نام در سازمان شما یکتا است."
      />
      <Button type="submit" disabled={submitting}>
        <AsyncButtonContent
          isPending={submitting}
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
        />
      </Button>
    </form>
  );
}
