import { ProtectedAppShell } from "@/features/auth";
import { CreateSupplierPage } from "@/features/suppliers";

export default function NewSupplierPage() {
  return (
    <ProtectedAppShell>
      <CreateSupplierPage />
    </ProtectedAppShell>
  );
}
