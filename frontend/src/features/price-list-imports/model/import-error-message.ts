import type { ApiRequestError } from "@/core/api/api-error";

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  IMPORT_FILE_ALREADY_EXISTS: "این فایل قبلاً برای همین تأمین‌کننده بارگذاری شده است.",
  SUPPLIER_INACTIVE: "این تأمین‌کننده غیرفعال است. برای بارگذاری جدید ابتدا آن را فعال کنید.",
  AUTH_FORBIDDEN: "اجازه بارگذاری فایل قیمت را ندارید.",
  OBJECT_STORAGE_UNAVAILABLE: "فضای نگهداری فایل موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.",
  NETWORK_ERROR: "ارتباط با سرویس برقرار نشد. اتصال را بررسی کنید.",
};

export function getImportErrorMessage(error: ApiRequestError): string {
  return ERROR_MESSAGES[error.code] ?? error.message;
}

export function getExistingImportId(error: ApiRequestError): string | null {
  const value = error.details.existing_import_id;
  return typeof value === "string" ? value : null;
}
