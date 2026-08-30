"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { PriceListComparisonPage } from "@/features/price-list-comparison";
import { useCurrentAccountQuery } from "@/services/auth";

import { AccountMenu } from "../components/account-menu";
import { AuthFeedback } from "../components/auth-feedback";
import { AuthStatusPanel } from "../components/auth-status-panel";
import { AUTH_ROUTES } from "../model/auth-routes";

export function ProtectedDashboard() {
  const router = useRouter();
  const account = useCurrentAccountQuery();
  const authenticatedAccount = account.data;
  const isUnauthorized =
    account.error?.status === 401 ||
    (account.isSuccess && !authenticatedAccount);

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

  if (!authenticatedAccount) return null;

  return (
    <PriceListComparisonPage
      accountActions={<AccountMenu account={authenticatedAccount} />}
    />
  );
}
