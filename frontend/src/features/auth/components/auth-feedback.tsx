import { CircleAlert, Info } from "lucide-react";
import type { Ref } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/cn";

interface AuthFeedbackProps {
  message: string;
  tone?: "error" | "info";
  className?: string;
  focusable?: boolean;
  feedbackRef?: Ref<HTMLDivElement>;
}

export function AuthFeedback({
  message,
  tone = "error",
  className,
  focusable = false,
  feedbackRef,
}: AuthFeedbackProps) {
  const Icon = tone === "error" ? CircleAlert : Info;

  return (
    <Alert
      variant={tone === "error" ? "destructive" : "default"}
      role={tone === "error" ? "alert" : "status"}
      tabIndex={focusable ? -1 : undefined}
      ref={feedbackRef}
      className={cn(
        tone === "info" && "border-blue-200 bg-blue-50 text-blue-900",
        className,
      )}
    >
      <Icon aria-hidden="true" />
      <AlertDescription className="text-current">{message}</AlertDescription>
    </Alert>
  );
}
