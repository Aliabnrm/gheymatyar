import { Badge } from "@/components/ui/badge";
import type { PriceListImportStatus } from "@/services/price-list-imports";

const STATUS_LABELS: Record<PriceListImportStatus, string> = {
  DRAFT: "پیش‌نویس آماده بازبینی",
  FAILED: "استخراج ناموفق",
};

export function ImportStatusBadge({ status }: { status: PriceListImportStatus }) {
  return (
    <Badge variant={status === "FAILED" ? "destructive" : "secondary"}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
