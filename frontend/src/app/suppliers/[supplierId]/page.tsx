import { ProtectedAppShell } from "@/features/auth";
import { SupplierDetailsPage } from "@/features/suppliers";

export default async function SupplierPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId } = await params;
  return (
    <ProtectedAppShell>
      <SupplierDetailsPage supplierId={supplierId} />
    </ProtectedAppShell>
  );
}
