import { ProtectedAppShell } from "@/features/auth";
import { ImportDetailsPage } from "@/features/price-list-imports";

export default async function PriceListImportPage({
  params,
}: {
  params: Promise<{ supplierId: string; importId: string }>;
}) {
  const { supplierId, importId } = await params;
  return (
    <ProtectedAppShell>
      <ImportDetailsPage supplierId={supplierId} importId={importId} />
    </ProtectedAppShell>
  );
}
