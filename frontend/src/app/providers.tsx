"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/core/query/query-provider";
import { UnauthorizedSessionListener } from "@/features/auth";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <UnauthorizedSessionListener />
      {children}
    </QueryProvider>
  );
}
