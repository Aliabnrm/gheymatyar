import { Badge } from "@/components/ui/badge";
import type { ReviewStatus } from "@/services/price-list-versions";

import { REVIEW_STATUS_LABELS } from "../model/approval-labels";

const STATUS_VARIANTS: Record<ReviewStatus, "default" | "secondary" | "destructive"> = {
  READY_FOR_REVIEW: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

export function ApprovalStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{REVIEW_STATUS_LABELS[status]}</Badge>;
}

export function CurrentVersionBadge() {
  return <Badge variant="outline">قیمت جاری</Badge>;
}
