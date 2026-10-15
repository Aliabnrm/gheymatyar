"use client";
import { useRouter } from "next/navigation";
import { useContextConfirmation } from "@/components/shared/hooks/use-context-confirmation";
import { useCreatePriceListVersionMutation } from "@/services/price-list-versions";
export interface CreateVersionContext {
  supplierId: string;
  importId: string;
  expectedPreviousVersionId: string | null;
  supplierIsActive: boolean;
}
export function useCreatePriceListVersion({
  supplierId,
  importId,
  expectedPreviousVersionId,
  supplierIsActive,
}: CreateVersionContext) {
  const router = useRouter();
  const { confirmed, setConfirmed } = useContextConfirmation(
    supplierIsActive ? [supplierId, importId, expectedPreviousVersionId ?? "none"].join(":") : null,
  );
  const createVersion = useCreatePriceListVersionMutation();

  async function submit(): Promise<void> {
    if (!confirmed || createVersion.isPending) return;
    try {
      const version = await createVersion.mutateAsync({
        supplierId,
        importId,
        input: {
          expectedPreviousVersionId,
          confirmCreate: true,
        },
      });
      router.push(`/suppliers/${supplierId}/price-list-versions/${version.id}`);
    } catch {
      setConfirmed(false);
      // Mutation state renders the safe API error below.
    }
  }

  return { confirmed, setConfirmed, createVersion, submit };
}
