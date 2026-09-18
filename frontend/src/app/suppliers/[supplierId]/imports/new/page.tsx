import { ProtectedAppShell } from "@/features/auth";
import { ImportUploadPage } from "@/features/price-list-imports";

export default async function NewPriceListImportPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const { supplierId } = await params;
  return (
    <ProtectedAppShell>
      <ImportUploadPage supplierId={supplierId} />
    </ProtectedAppShell>
  );
}
