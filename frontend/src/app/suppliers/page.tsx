import { ProtectedAppShell } from "@/features/auth";
import { SuppliersListPage } from "@/features/suppliers";

export default function SuppliersPage() {
  return (
    <ProtectedAppShell>
      <SuppliersListPage />
    </ProtectedAppShell>
  );
}
