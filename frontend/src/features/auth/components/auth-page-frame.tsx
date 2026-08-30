import type { ReactNode } from "react";

interface AuthPageFrameProps {
  children: ReactNode;
  busy?: boolean;
}

export function AuthPageFrame({ children, busy }: AuthPageFrameProps) {
  return (
    <main
      aria-busy={busy || undefined}
      className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_12%_18%,rgba(19,149,141,0.16),transparent_28rem),linear-gradient(135deg,var(--ink-950),var(--ink-800))] px-3 py-5 sm:px-5 sm:py-10"
    >
      {children}
    </main>
  );
}
