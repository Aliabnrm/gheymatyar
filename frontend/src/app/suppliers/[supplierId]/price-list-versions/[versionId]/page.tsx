import { ProtectedAppShell } from "@/features/auth";
import { VersionDetailsPage } from "@/features/price-list-versions";

export default async function PriceListVersionPage({
  params,
}: {
  params: Promise<{ supplierId: string; versionId: string }>;
}) {
  const { supplierId, versionId } = await params;
  return (
    <ProtectedAppShell>
      <VersionDetailsPage supplierId={supplierId} versionId={versionId} />
    </ProtectedAppShell>
  );
}
