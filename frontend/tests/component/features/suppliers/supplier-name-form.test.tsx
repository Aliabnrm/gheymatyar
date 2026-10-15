import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SupplierNameForm } from "@/features/suppliers/forms/supplier-name-form";

describe("SupplierNameForm", () => {
  it("accepts fresh server data without overwriting unsaved edits", async () => {
    const props = {
      submitLabel: "ذخیره",
      pendingLabel: "در حال ذخیره",
      isPending: false,
      error: null,
      onSubmit: vi.fn(),
    };
    const view = render(<SupplierNameForm {...props} initialName="نام اولیه" />);
    view.rerender(<SupplierNameForm {...props} initialName="نام تازه سرور" />);
    expect(screen.getByLabelText("نام تأمین‌کننده")).toHaveValue("نام تازه سرور");
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("نام تأمین‌کننده"));
    await user.type(screen.getByLabelText("نام تأمین‌کننده"), "ویرایش ذخیره‌نشده");
    view.rerender(<SupplierNameForm {...props} initialName="تغییر هم‌زمان سرور" />);
    expect(screen.getByLabelText("نام تأمین‌کننده")).toHaveValue("ویرایش ذخیره‌نشده");
  });
  it("validates locally and submits a trimmed supplier name", async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <SupplierNameForm
        submitLabel="ثبت تأمین‌کننده"
        pendingLabel="در حال ثبت…"
        isPending={false}
        error={null}
        onSubmit={submit}
      />,
    );

    await user.type(screen.getByLabelText("نام تأمین‌کننده"), "ا");
    await user.click(screen.getByRole("button", { name: "ثبت تأمین‌کننده" }));
    expect(submit).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("نام تأمین‌کننده"));
    await user.type(screen.getByLabelText("نام تأمین‌کننده"), "  شرکت نمونه  ");
    await user.click(screen.getByRole("button", { name: "ثبت تأمین‌کننده" }));
    expect(submit).toHaveBeenCalledWith({ name: "شرکت نمونه" }, expect.anything());
  });

  it("renders and focuses a server error", () => {
    render(
      <SupplierNameForm
        submitLabel="ثبت"
        pendingLabel="در حال ثبت…"
        isPending={false}
        error={new Error("نام تأمین‌کننده تکراری است.")}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("تکراری");
    expect(screen.getByRole("alert")).toHaveFocus();
  });
});
