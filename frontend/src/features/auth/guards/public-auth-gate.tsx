"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useCurrentAccountQuery } from "@/services/auth";

import { AuthPageFrame } from "../components/auth-page-frame";
import { AuthStatusPanel } from "../components/auth-status-panel";
import { AUTH_ROUTES } from "../model/auth-routes";

interface PublicAuthGateProps {
  children: ReactNode;
}

export function PublicAuthGate({ children }: PublicAuthGateProps) {
  const router = useRouter();
  const account = useCurrentAccountQuery();

  useEffect(() => {
    if (account.data) router.replace(AUTH_ROUTES.dashboard);
  }, [account.data, router]);

  if (account.isPending || account.data) {
    return (
      <AuthPageFrame busy>
        <AuthStatusPanel message="در حال بررسی نشست امن شما…" />
      </AuthPageFrame>
    );
  }

  return <>{children}</>;
}
