import type { ReviewStatus } from "@/services/price-list-versions";
import type { ApprovalContext } from "./current-price-impact-review";
export interface VersionApprovalProps {
  supplierId: string;
  versionId: string;
  reviewStatus: ReviewStatus;
  isOwner: boolean;
  approvalContext: ApprovalContext | null;
  onApprovalConflict: () => void;
}
export function decisionError(error: { status: number; message: string } | null): string | null {
  if (!error) return null;
  if (error.status === 409)
    return "وضعیت نسخه یا قیمت جاری تغییر کرده است. اطلاعات تازه دریافت شد؛ لطفاً دوباره بررسی کنید.";
  if (error.status === 403) return "فقط مالک سازمان اجازه تصمیم‌گیری دارد.";
  return error.message;
}
export function approvalBlockedReason(context: ApprovalContext | null): string | null {
  if (!context) return "برای تأیید، گزارش اثر بر قیمت جاری باید با مبنای ثابت دریافت و بررسی شود.";
  if (!context.isLatest) return "این نسخه جدیدترین نسخه ثبت‌شده نیست و امکان تأیید آن وجود ندارد.";
  if (!context.supplierIsActive)
    return "تأمین‌کننده غیرفعال است و این نسخه تا فعال‌شدن دوباره قابل تأیید نیست.";
  return null;
}
