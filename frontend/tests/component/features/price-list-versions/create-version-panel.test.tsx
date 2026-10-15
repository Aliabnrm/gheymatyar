import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateVersionPanel } from "@/features/price-list-versions/components/create-version-panel";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import { PREVIOUS_VERSION_ID, VERSION_API_FIXTURE } from "../../../fixtures/price-list-versions";

const mocks = vi.hoisted(() => ({
  mutation: {} as Record<string, unknown>,
  mutateAsync: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/services/price-list-versions", () => ({
  useCreatePriceListVersionMutation: () => mocks.mutation,
}));

beforeEach(() => {
  mocks.mutateAsync.mockReset();
  mocks.push.mockReset();
  mocks.mutation = {
    isPending: false,
    isError: false,
    mutateAsync: mocks.mutateAsync,
  };
});

function renderPanel(supplierIsActive = true) {
  return render(
    <CreateVersionPanel
      supplierId={IMPORT_API_FIXTURE.supplier.id}
      importId={IMPORT_API_FIXTURE.id}
      expectedPreviousVersionId={PREVIOUS_VERSION_ID}
      supplierIsActive={supplierIsActive}
    />,
  );
}

describe("CreateVersionPanel", () => {
  it("requires explicit confirmation and navigates after success", async () => {
    mocks.mutateAsync.mockResolvedValue({ id: VERSION_API_FIXTURE.id });
    renderPanel();
    const user = userEvent.setup();
    const button = screen.getByRole("button", {
      name: "ساخت نسخه تغییرناپذیر",
    });
    expect(button).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(button).toBeEnabled();
    await user.click(button);

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      supplierId: IMPORT_API_FIXTURE.supplier.id,
      importId: IMPORT_API_FIXTURE.id,
      input: {
        expectedPreviousVersionId: PREVIOUS_VERSION_ID,
        confirmCreate: true,
      },
    });
    expect(mocks.push).toHaveBeenCalledWith(
      `/suppliers/${IMPORT_API_FIXTURE.supplier.id}/price-list-versions/${VERSION_API_FIXTURE.id}`,
    );
  });

  it("prevents writes while pending or inactive", () => {
    mocks.mutation = {
      isPending: true,
      isError: false,
      mutateAsync: mocks.mutateAsync,
    };
    const view = renderPanel();
    expect(screen.getByRole("button", { name: "در حال ساخت نسخه…" })).toBeDisabled();

    mocks.mutation = {
      isPending: false,
      isError: false,
      mutateAsync: mocks.mutateAsync,
    };
    view.unmount();
    renderPanel(false);
    expect(screen.getByText(/تأمین‌کننده غیرفعال است/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ساخت نسخه تغییرناپذیر" })).toBeDisabled();
  });

  it("shows a dedicated baseline conflict message", () => {
    mocks.mutation = {
      isPending: false,
      isError: true,
      error: {
        code: "PRICE_LIST_BASELINE_CHANGED",
        message: "conflict",
      },
      mutateAsync: mocks.mutateAsync,
    };
    renderPanel();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "در فاصله بازبینی شما نسخه جدیدی ثبت شده است",
    );
  });
});

it("requires a new confirmation when the reviewed baseline changes", async () => {
  const props = {
    supplierId: IMPORT_API_FIXTURE.supplier.id,
    importId: IMPORT_API_FIXTURE.id,
    expectedPreviousVersionId: PREVIOUS_VERSION_ID,
    supplierIsActive: true,
  };
  const view = render(<CreateVersionPanel {...props} />);
  await userEvent.setup().click(screen.getByRole("checkbox"));
  view.rerender(<CreateVersionPanel {...props} expectedPreviousVersionId={null} />);
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(screen.getByRole("button", { name: "ساخت نسخه تغییرناپذیر" })).toBeDisabled();
});
