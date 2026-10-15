"use client";
import { useState } from "react";
import { useCurrentPriceImpactQuery, type ReviewStatus } from "@/services/price-list-versions";
import {
  deriveImpactReviewState,
  pinForReport,
  reportMatchesPin,
  UNPINNED_IMPACT,
} from "../model/current-price-impact-review";
import { useChangeReportFilters } from "./use-change-report-filters";

export function useCurrentPriceImpactReview(
  supplierId: string,
  versionId: string,
  reviewStatus: ReviewStatus | undefined,
  refreshTarget: () => Promise<unknown>,
) {
  const pagination = useChangeReportFilters();
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const enabled = reviewStatus === "READY_FOR_REVIEW";
  const discovery = useCurrentPriceImpactQuery(
    supplierId,
    versionId,
    { ...UNPINNED_IMPACT, changeType: null, limit: 1, offset: 0 },
    enabled,
  );
  const pin = discovery.data ? pinForReport(discovery.data) : UNPINNED_IMPACT;
  const report = useCurrentPriceImpactQuery(
    supplierId,
    versionId,
    { ...pin, ...pagination.filters },
    enabled && !!discovery.data,
  );
  const error = discovery.error ?? report.error;
  const pending =
    refreshing ||
    discovery.isPending ||
    discovery.isFetching ||
    report.isPending ||
    report.isFetching;
  const state = deriveImpactReviewState({
    enabled,
    pending: !!pending,
    error,
    report: report.data,
    pin,
    attempt,
  });

  async function restart(): Promise<void> {
    if (refreshing) return;
    setAttempt((current) => current + 1);
    setRefreshing(true);
    pagination.resetPage();
    try {
      const next = await discovery.refetch();
      // Same pin needs an explicit retry too; changing the pin starts a new query.
      if (next.data && reportMatchesPin(next.data, pin)) await report.refetch();
      await refreshTarget();
    } finally {
      setRefreshing(false);
    }
  }
  return {
    ...pagination,
    ...state,
    restart: () => {
      void restart();
    },
  };
}
