import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  offset: number;
  limit: number;
  total: number;
  onOffsetChange: (offset: number) => void;
  children: ReactNode;
}

export function PaginationControls({
  offset,
  limit,
  total,
  onOffsetChange,
  children,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={offset === 0}
        onClick={() => onOffsetChange(Math.max(0, offset - limit))}
      >
        صفحه قبل
      </Button>
      <span className="text-sm text-muted-foreground">{children}</span>
      <Button
        type="button"
        variant="outline"
        disabled={offset + limit >= total}
        onClick={() => onOffsetChange(offset + limit)}
      >
        صفحه بعد
      </Button>
    </div>
  );
}
