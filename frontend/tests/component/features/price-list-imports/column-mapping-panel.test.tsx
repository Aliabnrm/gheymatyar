import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { ColumnMappingPanel } from "@/features/price-list-imports/components/column-mapping-panel";
import { MAPPING_REVIEW_FIXTURE } from "../../../fixtures/column-mapping";

const mocks = vi.hoisted(() => ({
  review: {} as Record<string, unknown>,
  rerun: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/services/price-list-imports/column-mapping.hooks", () => ({
  useMappingReviewQuery: () => mocks.review,
  useRerunImportMutation: () => ({ mutate: mocks.rerun, isPending: false }),
  useSaveMappingTemplateMutation: () => ({
    mutate: mocks.save,
    isPending: false,
  }),
}));
beforeEach(() => {
  mocks.review = {
    data: structuredClone(MAPPING_REVIEW_FIXTURE),
    isPending: false,
    isError: false,
  };
  mocks.rerun.mockReset();
  mocks.save.mockReset();
});
const renderPanel = () =>
  render(<ColumnMappingPanel supplierId="supplier" importId="import" status="DRAFT" />);
describe("column mapping review", () => {
  it("shows loading and server error states", () => {
    mocks.review = { isPending: true };
    const view = renderPanel();
    expect(screen.getByRole("status")).toHaveTextContent("دریافت نگاشت");
    mocks.review = {
      isPending: false,
      isError: true,
      error: { message: "سرویس در دسترس نیست." },
    };
    view.rerender(<ColumnMappingPanel supplierId="supplier" importId="import" status="DRAFT" />);
    expect(screen.getByRole("alert")).toHaveTextContent("سرویس در دسترس نیست.");
  });
  it("shows preview and prevents duplicate and missing mappings", async () => {
    renderPanel();
    const user = userEvent.setup();
    expect(screen.getByRole("table", { name: "پیش‌نمایش محدود فایل" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("نام کالا *"), "1");
    expect(screen.getByRole("alert")).toHaveTextContent("هر ستون را فقط");
    expect(screen.getByRole("button", { name: "اجرای جدید با این نگاشت" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("نام کالا *"), "");
    expect(screen.getByRole("alert")).toHaveTextContent("الزامی");
  });
  it("keeps saving and rerunning separate", async () => {
    renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "ذخیره الگوی تأمین‌کننده" }));
    expect(mocks.save).toHaveBeenCalled();
    expect(mocks.rerun).not.toHaveBeenCalled();
  });
  it("renders empty preview and row error with its field and code", () => {
    const data = structuredClone(MAPPING_REVIEW_FIXTURE);
    data.inspection.preview = [];
    data.inspection.issues = [
      {
        row: 8,
        field: "price_irr",
        code: "INVALID_PRICE",
        message: "قیمت باید صحیح و مثبت باشد.",
      },
    ];
    data.inspection.total_errors = 1;
    mocks.review = { data, isPending: false, isError: false };
    renderPanel();
    expect(screen.getByText("ردیفی برای پیش‌نمایش وجود ندارد.")).toBeInTheDocument();
    expect(screen.getByText(/INVALID_PRICE/)).toBeInTheDocument();
    expect(screen.getByText(/قیمت باید صحیح/)).toBeInTheDocument();
  });
});

it("requires explicit confirmation to replace an existing supplier template", async () => {
  const data = structuredClone(MAPPING_REVIEW_FIXTURE);
  data.saved_template = {
    id: "5d408a88-b9d0-4f06-8a99-93a52e2e1fdd",
    source_import_id: "b3aa21c1-5012-4ae0-8d06-a8e7a9446810",
    created_at: "2026-09-06T08:00:00Z",
    mapping: data.inspection.used_mapping!,
  };
  mocks.review = { data, isPending: false, isError: false };
  renderPanel();
  const user = userEvent.setup();
  const button = screen.getByRole("button", {
    name: "جایگزینی الگوی تأمین‌کننده",
  });
  expect(button).toBeDisabled();
  await user.click(screen.getByRole("checkbox"));
  expect(button).toBeEnabled();
  await user.click(button);
  expect(mocks.save.mock.calls[0]![0]).toMatchObject({
    expected_template_id: data.saved_template.id,
    confirm_replace: true,
  });
});

it("blocks writes for inactive suppliers and renders spreadsheet markup as text", () => {
  const data = structuredClone(MAPPING_REVIEW_FIXTURE);
  data.can_edit = false;
  data.inspection.preview[0]!.values[1] = "<script>alert(1)</script>";
  mocks.review = { data, isPending: false, isError: false };
  renderPanel();
  expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "اجرای جدید با این نگاشت" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "ذخیره الگوی تأمین‌کننده" })).toBeDisabled();
});
