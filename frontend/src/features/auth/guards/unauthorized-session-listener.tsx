"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AUTH_UNAUTHORIZED_EVENT } from "@/core/api/auth-session-event";
import { clearAuthenticatedData } from "@/services/auth";

import { AUTH_ROUTES } from "../model/auth-routes";

export function UnauthorizedSessionListener() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthenticatedData(queryClient);
      if (pathname === AUTH_ROUTES.dashboard) {
        router.replace(AUTH_ROUTES.loginAfterSessionExpired);
      }
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [pathname, queryClient, router]);

  return null;
}
