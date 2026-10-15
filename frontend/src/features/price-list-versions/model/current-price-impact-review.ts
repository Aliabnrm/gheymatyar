import type { CurrentPriceImpact } from "@/services/price-list-versions";
import type { ApiRequestError } from "@/core/api/api-error";

export interface ImpactPin {
  baselineVersionId: string | null;
  expectNoCurrent: boolean;
}
export interface ApprovalContext {
  key: string;
  expectedCurrentVersionId: string | null;
  isLatest: boolean;
  supplierIsActive: boolean;
}
export const UNPINNED_IMPACT: ImpactPin = {
  baselineVersionId: null,
  expectNoCurrent: false,
};

export function pinForReport(report: CurrentPriceImpact): ImpactPin {
  return report.baselineStatus === "NO_CURRENT"
    ? { baselineVersionId: null, expectNoCurrent: true }
    : {
        baselineVersionId: report.baselineVersion.id,
        expectNoCurrent: false,
      };
}
export function reportMatchesPin(report: CurrentPriceImpact, pin: ImpactPin): boolean {
  return report.baselineStatus === "NO_CURRENT"
    ? pin.expectNoCurrent
    : !pin.expectNoCurrent && pin.baselineVersionId === report.baselineVersion?.id;
}
export function approvalContextFor(report: CurrentPriceImpact, attempt: number): ApprovalContext {
  const baselineId = report.baselineVersion?.id ?? null;
  return {
    key: [
      report.targetVersion.id,
      report.baselineStatus,
      baselineId ?? "none",
      report.isLatest,
      report.supplierIsActive,
      attempt,
    ].join(":"),
    expectedCurrentVersionId: baselineId,
    isLatest: report.isLatest,
    supplierIsActive: report.supplierIsActive,
  };
}

export function deriveImpactReviewState(input: {
  enabled: boolean;
  pending: boolean;
  error: ApiRequestError | null;
  report: CurrentPriceImpact | undefined;
  pin: ImpactPin;
  attempt: number;
}) {
  const unavailable = { report: undefined, approvalContext: null };
  if (!input.enabled) return { ...unavailable, status: "terminal" as const, error: null };
  if (input.error) return { ...unavailable, status: "error" as const, error: input.error };
  if (input.pending || !input.report || !reportMatchesPin(input.report, input.pin)) {
    return { ...unavailable, status: "loading" as const, error: null };
  }
  return {
    status: "ready" as const,
    error: null,
    report: input.report,
    approvalContext: approvalContextFor(input.report, input.attempt),
  };
}
