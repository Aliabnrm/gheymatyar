import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AuthPageFrame } from "./auth-page-frame";

interface AuthPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
  alternateText?: string;
  alternateHref?: "/login" | "/register";
  alternateLabel?: string;
}

export function AuthPageShell({
  title,
  description,
  children,
  alternateText,
  alternateHref,
  alternateLabel,
}: AuthPageShellProps) {
  return (
    <AuthPageFrame>
      <section className="w-full max-w-[29rem]" aria-labelledby="auth-title">
        <Card className="gap-0 border-white/15 bg-card/98 py-0 shadow-2xl">
          <CardHeader className="gap-6 px-6 pt-7 sm:px-9 sm:pt-9">
            <Link
              className="inline-flex w-fit items-center gap-3 text-foreground no-underline"
              href="/"
              aria-label="قیمت‌یار، صفحه اصلی"
            >
              <span
                className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--teal-500)] to-[var(--teal-700)] text-xl font-extrabold text-white shadow-inner"
                aria-hidden="true"
              >
                ق
              </span>
              <span>
                <strong className="block leading-tight">قیمت‌یار</strong>
                <small className="block text-xs text-muted-foreground">
                  مقایسه امن لیست قیمت
                </small>
              </span>
            </Link>
            <div className="grid gap-2">
              <p className="text-xs font-extrabold tracking-wide text-primary">
                فضای کاری سازمانی
              </p>
              <CardTitle>
                <h1 id="auth-title" className="text-2xl sm:text-[1.7rem]">
                  {title}
                </h1>
              </CardTitle>
              <CardDescription className="leading-6">
                {description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 pt-6 sm:px-9">{children}</CardContent>
          {alternateText && alternateHref && alternateLabel ? (
            <CardFooter className="justify-center px-6 py-6 text-center text-xs text-muted-foreground sm:px-9">
              <p>
                {alternateText}{" "}
                <Link
                  href={alternateHref}
                  className="font-bold text-primary underline-offset-4 hover:underline"
                >
                  {alternateLabel}
                </Link>
              </p>
            </CardFooter>
          ) : null}
        </Card>
      </section>
    </AuthPageFrame>
  );
}
