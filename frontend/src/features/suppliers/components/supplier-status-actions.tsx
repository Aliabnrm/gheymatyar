import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { useSupplierEditor } from "../hooks/use-supplier-editor";
type StatusEditor = Pick<
  ReturnType<typeof useSupplierEditor>,
  "pending" | "confirmDeactivate" | "setConfirmDeactivate" | "changeStatus"
>;
export function SupplierStatusActions({
  isActive,
  isOwner,
  editor,
}: {
  isActive: boolean;
  isOwner: boolean;
  editor: StatusEditor;
}) {
  const { confirmDeactivate, setConfirmDeactivate, changeStatus } = editor;
  if (!isOwner)
    return <p className="text-muted-foreground">دسترسی شما برای مشاهده این اطلاعات است.</p>;
  if (!isActive)
    return (
      <Button type="button" disabled={editor.pending} onClick={() => void changeStatus()}>
        فعال‌کردن دوباره
      </Button>
    );
  if (!confirmDeactivate)
    return (
      <Button type="button" variant="outline" onClick={() => setConfirmDeactivate(true)}>
        غیرفعال‌کردن
      </Button>
    );
  return (
    <Alert role="alert">
      <AlertDescription className="grid gap-3">
        <span>تأمین‌کننده حذف نمی‌شود و نام آن برای حفظ تاریخچه رزرو می‌ماند. ادامه می‌دهید؟</span>
        <span className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={editor.pending}
            onClick={() => void changeStatus()}
          >
            تأیید غیرفعال‌سازی
          </Button>
          <Button type="button" variant="outline" onClick={() => setConfirmDeactivate(false)}>
            انصراف
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
