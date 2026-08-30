"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { ControlledInputField } from "@/components/shared/forms/controlled-input-field";
import { Button } from "@/components/ui/button";
import {
  LoginInputSchema,
  useLoginMutation,
  type LoginFormInput,
  type LoginInput,
} from "@/services/auth";

import { AuthFeedback } from "../components/auth-feedback";
import { AUTH_ROUTES } from "../model/auth-routes";

const LOGIN_DEFAULT_VALUES: LoginFormInput = {
  email: "",
  password: "",
};

export function LoginForm() {
  const router = useRouter();
  const login = useLoginMutation();

  const errorRef = useRef<HTMLDivElement>(null);

  const form = useForm<LoginFormInput, unknown, LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: LOGIN_DEFAULT_VALUES,
    mode: "onSubmit",
  });

  const isPending = form.formState.isSubmitting || login.isPending;

  useEffect(() => {
    if (login.error) errorRef.current?.focus();
  }, [login.error]);

  async function submitLogin(input: LoginInput): Promise<void> {
    login.reset();
    try {
      await login.mutateAsync(input);
      router.replace(AUTH_ROUTES.dashboard);
    } catch {
      // The mutation error is rendered and focused by the effect above.
    }
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={form.handleSubmit(submitLogin)}
      aria-busy={isPending}
      noValidate
    >
      {login.error ? (
        <AuthFeedback
          message={login.error.message}
          focusable
          feedbackRef={errorRef}
        />
      ) : null}

      <ControlledInputField
        control={form.control}
        name="email"
        label="ایمیل"
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
        autoComplete="current-password"
        disabled={isPending}
        maxLength={128}
      />
      <Button className="h-11 w-full" type="submit" disabled={isPending}>
        <AsyncButtonContent
          isPending={isPending}
          idleLabel="ورود"
          pendingLabel="در حال ورود…"
        />
      </Button>
    </form>
  );
}
