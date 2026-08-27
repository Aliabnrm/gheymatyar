import type { ComparisonError } from "../model/types";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

type ValidFiles = {
  oldFile: File;
  newFile: File;
};

export type FileValidationResult =
  | { valid: true; files: ValidFiles }
  | { valid: false; error: ComparisonError };

export function validateComparisonFiles(
  oldFile: File | null,
  newFile: File | null,
): FileValidationResult {
  if (!oldFile || !newFile) {
    return {
      valid: false,
      error: {
        code: "FILES_REQUIRED",
        message: "نسخه قدیم و نسخه جدید را انتخاب کنید.",
      },
    };
  }

  for (const file of [oldFile, newFile]) {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return {
        valid: false,
        error: {
          code: "INVALID_FILE_TYPE",
          message: "در نسخه فعلی فقط فایل XLSX پذیرفته می‌شود.",
        },
      };
    }
    if (file.size > MAX_FILE_BYTES) {
      return {
        valid: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "حجم هر فایل باید کمتر از ۱۰ مگابایت باشد.",
        },
      };
    }
  }

  return { valid: true, files: { oldFile, newFile } };
}
