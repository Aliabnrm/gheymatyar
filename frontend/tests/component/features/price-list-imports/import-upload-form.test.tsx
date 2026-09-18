import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportUploadForm } from "@/features/price-list-imports/forms/import-upload-form";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  mutation: {} as Record<string, unknown>,
}));

vi.mock("@/services/price-list-imports", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/price-list-imports")>();
  return {
    ...original,
    useUploadPriceListImportMutation: () => ({
      isPending: false,
      error: null,
      ...mocks.mutation,
      mutateAsync: mocks.mutateAsync,
      reset: mocks.reset,
    }),
  };
});

beforeEach(() => {
  mocks.mutation = {};
  mocks.mutateAsync.mockReset();
  mocks.reset.mockReset();
});

describe("ImportUploadForm", () => {
  it("rejects a non-XLSX file before calling the mutation", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(
      <ImportUploadForm
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        onCompleted={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("فایل لیست قیمت"),
      new File(["csv"], "prices.csv", { type: "text/csv" }),
    );
    await user.click(
      screen.getByRole("button", { name: "بارگذاری و استخراج فایل" }),
    );

    expect(
      await screen.findByText("فقط فایل XLSX قابل بارگذاری است."),
    ).toBeInTheDocument();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("uploads a valid file once and reports the completed import", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    mocks.mutateAsync.mockResolvedValue({
      ...IMPORT_API_FIXTURE,
      sourceDocument: {},
    });
    render(
      <ImportUploadForm
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        onCompleted={onCompleted}
      />,
    );

    const file = new File(["xlsx"], "prices.xlsx");
    await user.upload(screen.getByLabelText("فایل لیست قیمت"), file);
    await user.click(
      screen.getByRole("button", { name: "بارگذاری و استخراج فایل" }),
    );

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      supplierId: IMPORT_API_FIXTURE.supplier.id,
      input: { file },
    });
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });
});
