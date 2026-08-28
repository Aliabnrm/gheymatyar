"use client";

import type { ReactNode } from "react";

import { QueryProvider } from "@/core/query/query-provider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <QueryProvider>{children}</QueryProvider>;
}
