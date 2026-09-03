"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useCurrentAccountQuery } from "@/services/auth";

import { AccountMenu } from "../components/account-menu";
import { AuthFeedback } from "../components/auth-feedback";
import { AuthStatusPanel } from "../components/auth-status-panel";
import { AUTH_ROUTES } from "../model/auth-routes";

export function ProtectedAppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const account = useCurrentAccountQuery();
  const isUnauthorized =
    account.error?.status === 401 || (account.isSuccess && !account.data);

  useEffect(() => {
    if (isUnauthorized) router.replace(AUTH_ROUTES.loginAfterSessionExpired);
  }, [isUnauthorized, router]);

  if (account.isPending || isUnauthorized) {
    return (
      <main
        className="grid min-h-screen place-items-center bg-background p-5"
        aria-busy="true"
      >
        <AuthStatusPanel message="در حال بررسی نشست و سازمان جاری…" />
      </main>
    );
  }

  if (account.isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-5">
        <AuthStatusPanel
          message="بازیابی فضای کاری کامل نشد."
          error={
            <AuthFeedback message="دریافت اطلاعات حساب ممکن نشد. اتصال را بررسی و دوباره تلاش کنید." />
          }
          action={
            <Button type="button" onClick={() => account.refetch()}>
              <RefreshCw aria-hidden="true" />
              تلاش دوباره
            </Button>
          }
        />
      </main>
    );
  }

  if (!account.data) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-lg font-bold"
              aria-label="قیمت‌یار، صفحه اصلی"
            >
              قیمت‌یار
            </Link>
            <nav aria-label="ناوبری اصلی" className="flex items-center gap-1">
              <Button
                asChild
                variant={pathname === "/" ? "secondary" : "ghost"}
                size="sm"
              >
                <Link href="/">مقایسه قیمت</Link>
              </Button>
              <Button
                asChild
                variant={
                  pathname.startsWith("/suppliers") ? "secondary" : "ghost"
                }
                size="sm"
              >
                <Link href="/suppliers">تأمین‌کنندگان</Link>
              </Button>
            </nav>
          </div>
          <AccountMenu account={account.data} />
        </div>
      </header>
      {children}
    </div>
  );
}
