import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VersionApprovalPanel } from "@/features/price-list-versions";
import { ApiRequestError } from "@/core/api/api-error";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import { PREVIOUS_VERSION_ID, VERSION_ID } from "../../../fixtures/price-list-versions";

const mocks = vi.hoisted(() => ({
  approve: {} as Record<string, unknown>,
  approveAsync: vi.fn(),
  conflict: vi.fn(),
  reject: {} as Record<string, unknown>,
  rejectAsync: vi.fn(),
}));

vi.mock("@/services/price-list-versions", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/price-list-versions")>();
  return {
    ...original,
    useApprovePriceListVersionMutation: () => mocks.approve,
    useRejectPriceListVersionMutation: () => mocks.reject,
  };
});

beforeEach(() => {
  mocks.approveAsync.mockReset();
  mocks.conflict.mockReset();
  mocks.rejectAsync.mockReset();
  mocks.approve = {
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: mocks.approveAsync,
  };
  mocks.reject = {
    isPending: false,
    error: null,
    reset: vi.fn(),
    mutateAsync: mocks.rejectAsync,
  };
});

function renderPanel(
  isOwner = true,
  reviewStatus = "READY_FOR_REVIEW" as const,
  approvalContext: {
    key: string;
    expectedCurrentVersionId: string | null;
    isLatest: boolean;
    supplierIsActive: boolean;
  } | null = {
    key: `current:${PREVIOUS_VERSION_ID}`,
    expectedCurrentVersionId: PREVIOUS_VERSION_ID,
    isLatest: true,
    supplierIsActive: true,
  },
) {
  return render(
    <VersionApprovalPanel
      supplierId={IMPORT_API_FIXTURE.supplier.id}
      versionId={VERSION_ID}
      reviewStatus={reviewStatus}
      isOwner={isOwner}
      approvalContext={approvalContext}
      onApprovalConflict={mocks.conflict}
    />,
  );
}

describe("VersionApprovalPanel", () => {
  it("requires confirmation and submits the observed current version", async () => {
    mocks.approveAsync.mockResolvedValue({});
    renderPanel();
    const user = userEvent.setup();
    const approveButton = screen.getByRole("button", {
      name: "تأیید و انتخاب قیمت جاری",
    });
    expect(approveButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /تغییرات نسخه را بررسی کردم/ }));
    await user.type(screen.getByLabelText("یادداشت تأیید (اختیاری)"), "تأیید شد");
    await user.click(approveButton);

    expect(mocks.approveAsync).toHaveBeenCalledWith({
      supplierId: IMPORT_API_FIXTURE.supplier.id,
      versionId: VERSION_ID,
      input: {
        expectedCurrentVersionId: PREVIOUS_VERSION_ID,
        confirmApproval: true,
        decisionNote: "تأیید شد",
      },
    });
    expect(await screen.findByText(/نسخه تأیید شد و به‌عنوان قیمت جاری/)).toBeInTheDocument();
  });

  it("validates rejection and supports keyboard closing", async () => {
    renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "رد نسخه" }));
    const reason = screen.getByLabelText("دلیل رد نسخه");
    expect(reason).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "ثبت رد نسخه" }));
    expect(screen.getByRole("alert")).toHaveTextContent("تأیید صریح رد نسخه الزامی است");

    await user.keyboard("{Escape}");
    expect(screen.queryByLabelText("دلیل رد نسخه")).not.toBeInTheDocument();
  });

  it("submits a trimmed rejection reason", async () => {
    mocks.rejectAsync.mockResolvedValue({});
    renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "رد نسخه" }));
    await user.type(screen.getByLabelText("دلیل رد نسخه"), "  قیمت اشتباه است  ");
    await user.click(
      screen.getByRole("checkbox", {
        name: "رد نهایی این نسخه را تأیید می‌کنم.",
      }),
    );
    await user.click(screen.getByRole("button", { name: "ثبت رد نسخه" }));

    await waitFor(() =>
      expect(mocks.rejectAsync).toHaveBeenCalledWith({
        supplierId: IMPORT_API_FIXTURE.supplier.id,
        versionId: VERSION_ID,
        input: { confirmRejection: true, reason: "قیمت اشتباه است" },
      }),
    );
  });

  it("is read-only for operators and terminal decisions", () => {
    const view = renderPanel(false);
    expect(screen.getByText(/دسترسی شما فقط برای مشاهده/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /تأیید/ })).not.toBeInTheDocument();

    view.rerender(
      <VersionApprovalPanel
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        versionId={VERSION_ID}
        reviewStatus="APPROVED"
        isOwner
        approvalContext={null}
        onApprovalConflict={mocks.conflict}
      />,
    );
    expect(screen.getByText(/تصمیم این نسخه نهایی است/)).toBeInTheDocument();
  });

  it("shows pending, conflict and server errors", () => {
    mocks.approve = {
      isPending: true,
      error: null,
      reset: vi.fn(),
      mutateAsync: mocks.approveAsync,
    };
    const view = renderPanel();
    expect(screen.getByRole("button", { name: "در حال تأیید…" })).toBeDisabled();

    mocks.approve = {
      isPending: false,
      error: { status: 409, message: "conflict" },
      reset: vi.fn(),
      mutateAsync: mocks.approveAsync,
    };
    view.rerender(
      <VersionApprovalPanel
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        versionId={VERSION_ID}
        reviewStatus="READY_FOR_REVIEW"
        isOwner
        approvalContext={{
          key: `current:${PREVIOUS_VERSION_ID}`,
          expectedCurrentVersionId: PREVIOUS_VERSION_ID,
          isLatest: true,
          supplierIsActive: true,
        }}
        onApprovalConflict={mocks.conflict}
      />,
    );
    expect(screen.getByRole("alert", { name: "" })).toHaveTextContent("اطلاعات تازه دریافت شد");
  });

  it("blocks approval without a pinned report but keeps rejection available", async () => {
    renderPanel(true, "READY_FOR_REVIEW", null);
    expect(screen.getByText(/گزارش اثر بر قیمت جاری باید با مبنای ثابت/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تأیید و انتخاب قیمت جاری" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "رد نسخه" })).toBeEnabled();
  });

  it("blocks approval for a non-latest version or inactive supplier", () => {
    const view = renderPanel(true, "READY_FOR_REVIEW", {
      key: `current:${PREVIOUS_VERSION_ID}`,
      expectedCurrentVersionId: PREVIOUS_VERSION_ID,
      isLatest: false,
      supplierIsActive: true,
    });
    expect(screen.getByText(/جدیدترین نسخه ثبت‌شده نیست/)).toBeInTheDocument();

    view.rerender(
      <VersionApprovalPanel
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        versionId={VERSION_ID}
        reviewStatus="READY_FOR_REVIEW"
        isOwner
        approvalContext={{
          key: `current:${PREVIOUS_VERSION_ID}`,
          expectedCurrentVersionId: PREVIOUS_VERSION_ID,
          isLatest: true,
          supplierIsActive: false,
        }}
        onApprovalConflict={mocks.conflict}
      />,
    );
    expect(screen.getByText(/تأمین‌کننده غیرفعال است/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "رد نسخه" })).toBeEnabled();
  });

  it("clears confirmation and refreshes the report after an approval conflict", async () => {
    mocks.approveAsync.mockRejectedValue(
      new ApiRequestError("تعارض", {
        code: "CURRENT_PRICE_VERSION_CHANGED",
        status: 409,
      }),
    );
    renderPanel();
    const user = userEvent.setup();
    const confirmation = screen.getByRole("checkbox", {
      name: /تغییرات نسخه را بررسی کردم/,
    });
    await user.click(confirmation);
    await user.click(screen.getByRole("button", { name: "تأیید و انتخاب قیمت جاری" }));

    await waitFor(() => expect(mocks.conflict).toHaveBeenCalledOnce());
    expect(confirmation).not.toBeChecked();
    expect(mocks.approveAsync).toHaveBeenCalledOnce();
  });
});
