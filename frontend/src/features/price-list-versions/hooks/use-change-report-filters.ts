"use client";
import { useState } from "react";
import type { ChangeType } from "@/services/price-list-shared/price-list-change.schema";

export function useChangeReportFilters() {
  const [filters, setFilters] = useState({
    changeType: null as ChangeType | null,
    limit: 50,
    offset: 0,
  });
  return {
    filters,
    selectChangeType: (changeType: ChangeType | null) =>
      setFilters((current) => ({ ...current, changeType, offset: 0 })),
    setOffset: (offset: number) => setFilters((current) => ({ ...current, offset })),
    resetPage: () => setFilters((current) => ({ ...current, offset: 0 })),
  };
}
