import type { PriceListAuditEvent, ReviewStatus } from "@/services/price-list-versions";

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  READY_FOR_REVIEW: "آماده بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
};

export const REVIEW_STATUS_DESCRIPTIONS: Record<ReviewStatus, string> = {
  READY_FOR_REVIEW: "این نسخه ثبت شده، اما تا پیش از تصمیم صریح مالک قیمت جاری محسوب نمی‌شود.",
  APPROVED: "این نسخه پس از بازبینی انسانی تأیید شده است. داده‌های تاریخی آن تغییر نمی‌کنند.",
  REJECTED:
    "این نسخه رد شده و نمی‌تواند قیمت جاری باشد. اصلاح باید با Import و نسخه جدید انجام شود.",
};

export const AUDIT_ACTION_LABELS: Record<PriceListAuditEvent["action"], string> = {
  PRICE_LIST_VERSION_APPROVED: "نسخه تأیید شد",
  PRICE_LIST_VERSION_REJECTED: "نسخه رد شد",
};
