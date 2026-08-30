"use client";

import { useRouter } from "next/navigation";

import { AsyncButtonContent } from "@/components/shared/async-button-content";
import { Button } from "@/components/ui/button";
import { useLogoutMutation, type AuthContext } from "@/services/auth";

import { AuthFeedback } from "./auth-feedback";
import { AUTH_ROUTES } from "../model/auth-routes";
import { ORGANIZATION_ROLE_LABELS } from "../model/role-labels";

export function AccountMenu({ account }: { account: AuthContext }) {
  const router = useRouter();
  const logout = useLogoutMutation();

  return (
    <div className="relative flex items-center gap-3">
      <div className="hidden max-w-sm text-left sm:block">
        <strong className="block truncate text-xs text-white">
          {account.organization.name}
        </strong>
        <span className="block text-[0.68rem] text-slate-300">
          <b className="text-teal-300">
            {ORGANIZATION_ROLE_LABELS[account.membership.role]}
          </b>
          <span aria-hidden="true"> · </span>
          <span dir="ltr">{account.user.email}</span>
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        type="button"
        disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, {
            onSuccess: () => router.replace(AUTH_ROUTES.loginAfterLogout),
          })
        }
      >
        <AsyncButtonContent
          isPending={logout.isPending}
          idleLabel="خروج"
          pendingLabel="در حال خروج…"
        />
      </Button>
      {logout.error ? (
        <AuthFeedback
          message={logout.error.message}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-72 bg-card shadow-lg"
        />
      ) : null}
    </div>
  );
}
