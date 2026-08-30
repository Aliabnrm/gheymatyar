import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthStatusPanelProps {
  message: string;
  action?: ReactNode;
  error?: ReactNode;
}

export function AuthStatusPanel({
  message,
  action,
  error,
}: AuthStatusPanelProps) {
  return (
    <Card className="w-full max-w-md border-border/80 shadow-xl">
      <CardContent className="grid justify-items-center gap-4 py-3 text-center">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck aria-hidden="true" />
        </span>
        <div className="grid w-full gap-2" role="status">
          <p className="text-sm font-medium text-foreground">{message}</p>
          {!error ? <Skeleton className="mx-auto h-2 w-32" /> : null}
        </div>
        {error}
        {action}
      </CardContent>
    </Card>
  );
}
