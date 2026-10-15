import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VersionDetailsPage } from "@/features/price-list-versions";
import {
  CurrentPriceImpactSchema,
  type ChangeReportFilters,
  type CurrentPriceImpactFilters,
} from "@/services/price-list-versions";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import {
  NO_CURRENT_PRICE_IMPACT_API_FIXTURE,
  PREVIOUS_VERSION_ID,
  VERSION_ID,
} from "../../../fixtures/price-list-versions";

const mocks = vi.hoisted(() => ({
  approveAsync: vi.fn(),
  changeFilters: [] as ChangeReportFilters[],
  impactFilters: [] as CurrentPriceImpactFilters[],
  impact: null as unknown,
  impactError: null as { status: number; message: string } | null,
  reviewStatus: "READY_FOR_REVIEW",
}));

vi.mock("@/services/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/auth")>();
  return {
    ...original,
    useCurrentAccountQuery: () => ({
      data: { membership: { role: "OWNER" } },
    }),
  };
});

vi.mock("@/services/price-list-versions", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/price-list-versions")>();
  const fixtures = await import("../../../fixtures/price-list-versions");
  const historicalBaselineId = "cddcd9fc-da48-4fc8-af56-07517ccfd05c";
  const version = original.PriceListVersionSchema.parse({
    ...fixtures.VERSION_API_FIXTURE,
    previous_version_id: historicalBaselineId,
    version_number: 3,
  });
  const changes = original.VersionChangeReportSchema.parse({
    version_id: fixtures.VERSION_ID,
    created_version: null,
    baseline_version: {
      id: historicalBaselineId,
      version_number: 2,
      created_at: "2026-09-17T08:00:00Z",
    },
    summary: fixtures.IMPORT_CHANGE_REPORT_API_FIXTURE.summary,
    items: fixtures.IMPORT_CHANGE_REPORT_API_FIXTURE.items,
    total: 1,
    limit: 50,
    offset: 0,
  });
  const impact = original.CurrentPriceImpactSchema.parse(fixtures.CURRENT_PRICE_IMPACT_API_FIXTURE);
  return {
    ...original,
    usePriceListVersionQuery: () => ({
      isPending: false,
      isError: false,
      data: { ...version, reviewStatus: mocks.reviewStatus },
    }),
    usePriceListVersionChangesQuery: (
      _supplierId: string,
      _versionId: string,
      filters: ChangeReportFilters,
    ) => {
      mocks.changeFilters.push(filters);
      return { isPending: false, isError: false, data: changes };
    },
    useCurrentPriceImpactQuery: (
      _supplierId: string,
      _versionId: string,
      filters: CurrentPriceImpactFilters,
    ) => {
      mocks.impactFilters.push(filters);
      return {
        isPending: false,
        isError: false,
        error: mocks.impactError,
        data: mocks.impact ?? impact,
        refetch: vi.fn(),
      };
    },
    usePriceListVersionItemsQuery: () => ({
      isPending: false,
      isError: false,
      data: { items: [], total: 0, limit: 50, offset: 0 },
    }),
    usePriceListVersionAuditEventsQuery: () => ({
      isPending: false,
      isError: false,
      data: { items: [], total: 0, limit: 20, offset: 0 },
    }),
    useApprovePriceListVersionMutation: () => ({
      isPending: false,
      error: null,
      reset: vi.fn(),
      mutateAsync: mocks.approveAsync,
    }),
    useRejectPriceListVersionMutation: () => ({
      isPending: false,
      error: null,
      reset: vi.fn(),
      mutateAsync: vi.fn(),
    }),
  };
});

beforeEach(() => {
  mocks.approveAsync.mockReset();
  mocks.approveAsync.mockResolvedValue({});
  mocks.changeFilters.length = 0;
  mocks.impactFilters.length = 0;
  mocks.impact = null;
  mocks.impactError = null;
  mocks.reviewStatus = "READY_FOR_REVIEW";
});

describe("VersionDetailsPage current-price impact", () => {
  it("shows distinct historical and current baselines and approves with the report baseline", async () => {
    render(
      <VersionDetailsPage supplierId={IMPORT_API_FIXTURE.supplier.id} versionId={VERSION_ID} />,
    );

    expect(
      screen.getByRole("heading", {
        name: "تغییرات نسبت به نسخه قبلی ثبت‌شده",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "اثر این نسخه بر قیمت جاری" })).toBeInTheDocument();
    expect(screen.getByText(/مبنای تاریخی: نسخه ۲/)).toBeInTheDocument();
    expect(screen.getByText(/مبنای عملیاتی: قیمت جاری نسخه ۱/)).toBeInTheDocument();
    expect(screen.getAllByText("001-A").length).toBeGreaterThanOrEqual(2);

    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /تغییرات نسخه را بررسی کردم/ }));
    await user.click(screen.getByRole("button", { name: "تأیید و انتخاب قیمت جاری" }));

    await waitFor(() =>
      expect(mocks.approveAsync).toHaveBeenCalledWith({
        supplierId: IMPORT_API_FIXTURE.supplier.id,
        versionId: VERSION_ID,
        input: {
          expectedCurrentVersionId: PREVIOUS_VERSION_ID,
          confirmApproval: true,
          decisionNote: null,
        },
      }),
    );
  });

  it("keeps historical and current-impact filters independent", async () => {
    render(
      <VersionDetailsPage supplierId={IMPORT_API_FIXTURE.supplier.id} versionId={VERSION_ID} />,
    );
    const user = userEvent.setup();
    const impactFilters = screen.getByLabelText("فیلتر اثر بر قیمت جاری");
    await user.click(
      within(impactFilters).getByRole("button", {
        name: "بسته‌بندی",
      }),
    );

    expect(mocks.impactFilters.at(-1)?.changeType).toBe("PACK_SIZE_CHANGED");
    expect(mocks.changeFilters.at(-1)?.changeType).toBeNull();
  });

  it("shows NO_CURRENT and approves the first current version with a null baseline", async () => {
    mocks.impact = CurrentPriceImpactSchema.parse(NO_CURRENT_PRICE_IMPACT_API_FIXTURE);
    render(
      <VersionDetailsPage supplierId={IMPORT_API_FIXTURE.supplier.id} versionId={VERSION_ID} />,
    );
    expect(screen.getByText(/اولین قیمت جاری خواهد شد/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /تغییرات نسخه را بررسی کردم/ }));
    await user.click(screen.getByRole("button", { name: "تأیید و انتخاب قیمت جاری" }));
    await waitFor(() =>
      expect(mocks.approveAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ expectedCurrentVersionId: null }),
        }),
      ),
    );
  });
});

it("blocks approval on a report refetch failure even when cached data exists", async () => {
  const view = render(
    <VersionDetailsPage supplierId={IMPORT_API_FIXTURE.supplier.id} versionId={VERSION_ID} />,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("checkbox", { name: /تغییرات نسخه را بررسی کردم/ }));
  mocks.impactError = { status: 409, message: "baseline changed" };
  view.rerender(
    <VersionDetailsPage supplierId={IMPORT_API_FIXTURE.supplier.id} versionId={VERSION_ID} />,
  );
  expect(screen.getByRole("button", { name: "تأیید و انتخاب قیمت جاری" })).toBeDisabled();
  mocks.impactError = null;
  view.rerender(
    <VersionDetailsPage supplierId={IMPORT_API_FIXTURE.supplier.id} versionId={VERSION_ID} />,
  );
  expect(screen.getByRole("checkbox", { name: /تغییرات نسخه را بررسی کردم/ })).not.toBeChecked();
});
it("hides the cached live report after the target becomes terminal", () => {
  const view = render(
    <VersionDetailsPage supplierId={IMPORT_API_FIXTURE.supplier.id} versionId={VERSION_ID} />,
  );
  mocks.reviewStatus = "APPROVED";
  view.rerender(
    <VersionDetailsPage supplierId={IMPORT_API_FIXTURE.supplier.id} versionId={VERSION_ID} />,
  );
  expect(screen.queryByText(/مبنای عملیاتی: قیمت جاری/)).not.toBeInTheDocument();
});
