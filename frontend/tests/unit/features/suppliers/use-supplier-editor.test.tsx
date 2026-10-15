import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/core/api/api-error";
import { useSupplierEditor } from "@/features/suppliers/hooks/use-supplier-editor";
import { SUPPLIER_FIXTURE } from "../../../fixtures/suppliers";
const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/services/suppliers/suppliers.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/suppliers/suppliers.api")>()),
  updateSupplierApi: mocks.update,
}));
describe("supplier editor operation feedback", () => {
  it("keeps a status failure out of the name form and permits a later rename", async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSupplierEditor(SUPPLIER_FIXTURE.id, SUPPLIER_FIXTURE), {
      wrapper,
    });
    mocks.update.mockRejectedValueOnce(
      new ApiRequestError("تغییر وضعیت ممکن نشد", {
        code: "SERVER_ERROR",
        status: 503,
      }),
    );
    await act(() => result.current.changeStatus());
    await waitFor(() => expect(result.current.status.error?.message).toBe("تغییر وضعیت ممکن نشد"));
    expect(result.current.name.error).toBeNull();
    mocks.update.mockResolvedValueOnce({
      ...SUPPLIER_FIXTURE,
      name: "نام تازه",
    });
    await act(() => result.current.rename({ name: "نام تازه" }));
    await waitFor(() => expect(result.current.name.isSuccess).toBe(true));
    expect(result.current.status.error?.message).toBe("تغییر وضعیت ممکن نشد");
  });
});
