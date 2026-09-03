import { PriceListComparisonPage } from "@/features/price-list-comparison";
import { ProtectedAppShell } from "./protected-app-shell";

export function ProtectedDashboard() {
  return (
    <ProtectedAppShell>
      <PriceListComparisonPage />
    </ProtectedAppShell>
  );
}
