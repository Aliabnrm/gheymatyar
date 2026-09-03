"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { ControlledInputField } from "@/components/shared/forms/controlled-input-field";
import { Button } from "@/components/ui/button";
import {
  RegisterInputSchema,
  useRegisterMutation,
  type RegisterFormInput,
  type RegisterInput,
} from "@/services/auth";

import { AuthFeedback } from "../components/auth-feedback";
import { AUTH_ROUTES } from "../model/auth-routes";

const REGISTER_DEFAULT_VALUES: RegisterFormInput = {
  organizationName: "",
  email: "",
  password: "",
};

export function RegisterForm() {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);

  const registration = useRegisterMutation();

  const form = useForm<RegisterFormInput, unknown, RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: REGISTER_DEFAULT_VALUES,
    mode: "onSubmit",
  });

  const isPending = form.formState.isSubmitting || registration.isPending;

  useEffect(() => {
    if (registration.error) errorRef.current?.focus();
  }, [registration.error]);

  async function submitRegistration(input: RegisterInput): Promise<void> {
    registration.reset();
    try {
      await registration.mutateAsync(input);
      router.replace(AUTH_ROUTES.dashboard);
    } catch {
      // The mutation error is rendered and focused by the effect above.
    }
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit(submitRegistration)}
      aria-busy={isPending}
      noValidate
    >
      {registration.error ? (
        <AuthFeedback
          message={registration.error.message}
          focusable
          feedbackRef={errorRef}
        />
      ) : null}

      <ControlledInputField
        control={form.control}
        name="organizationName"
        label="نام سازمان"
        type="text"
        autoComplete="organization"
        disabled={isPending}
        maxLength={120}
      />
      <ControlledInputField
        control={form.control}
        name="email"
        label="ایمیل مالک"
        type="email"
        inputMode="email"
        autoComplete="email"
        dir="ltr"
        disabled={isPending}
        maxLength={254}
      />
      <ControlledInputField
        control={form.control}
        name="password"
        label="رمز عبور"
        type="password"
        autoComplete="new-password"
        disabled={isPending}
        minLength={12}
        maxLength={128}
        description="حداقل ۱۲ و حداکثر ۱۲۸ نویسه؛ رمز در مرورگر ذخیره نمی‌شود."
      />
      <Button className="h-11 w-full" type="submit" disabled={isPending}>
        <AsyncButtonContent
          isPending={isPending}
          idleLabel="ساخت حساب و سازمان"
          pendingLabel="در حال ساخت حساب…"
        />
      </Button>
    </form>
  );
}
