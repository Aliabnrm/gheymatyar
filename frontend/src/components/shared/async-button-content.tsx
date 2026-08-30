import { LoaderCircle } from "lucide-react";

interface AsyncButtonContentProps {
  idleLabel: string;
  pendingLabel: string;
  isPending: boolean;
}

export function AsyncButtonContent({
  idleLabel,
  pendingLabel,
  isPending,
}: AsyncButtonContentProps) {
  if (!isPending) return idleLabel;

  return (
    <>
      <LoaderCircle className="animate-spin" aria-hidden="true" />
      {pendingLabel}
    </>
  );
}
