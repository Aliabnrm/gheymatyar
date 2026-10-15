"use client";
import { useContextConfirmation } from "@/components/shared/hooks/use-context-confirmation";
import {
  useUpdateSupplierMutation,
  type Supplier,
  type SupplierNameInput,
} from "@/services/suppliers";
export function useSupplierEditor(supplierId: string, supplier: Supplier | undefined) {
  const name = useUpdateSupplierMutation();
  const status = useUpdateSupplierMutation();
  const pending = name.isPending || status.isPending;
  const { confirmed: confirmDeactivate, setConfirmed: setConfirmDeactivate } =
    useContextConfirmation(supplier?.isActive ? supplierId : null);
  async function rename(input: SupplierNameInput): Promise<void> {
    if (pending) return;
    name.reset();
    try {
      await name.mutateAsync({ supplierId, input: { name: input.name } });
    } catch {
      /* The name form owns its mutation feedback. */
    }
  }
  async function changeStatus(): Promise<void> {
    if (!supplier || pending) return;
    status.reset();
    try {
      await status.mutateAsync({
        supplierId,
        input: { isActive: !supplier.isActive },
      });
      setConfirmDeactivate(false);
    } catch {
      /* The status card owns its mutation feedback. */
    }
  }
  return {
    name,
    status,
    pending,
    confirmDeactivate,
    setConfirmDeactivate,
    rename,
    changeStatus,
  };
}
