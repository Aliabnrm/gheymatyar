import type { FormEvent } from "react";

import type { ComparisonError } from "../model/types";
import { FileSelector } from "./file-selector";

interface UploadPanelProps {
  oldFile: File | null;
  newFile: File | null;
  error: ComparisonError | null;
  isSubmitting: boolean;
  onOldFileChange: (file: File | null) => void;
  onNewFileChange: (file: File | null) => void;
  onSubmit: () => void;
}

export function UploadPanel({
  oldFile,
  newFile,
  error,
  isSubmitting,
  onOldFileChange,
  onNewFileChange,
  onSubmit,
}: UploadPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      className="upload-panel"
      aria-busy={isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="section-heading">
        <div>
          <span className="step-label">گام ۱ از ۲</span>
          <h2>فایل‌های مقایسه را انتخاب کنید</h2>
          <p>هر دو فایل باید مربوط به یک تأمین‌کننده و با واحد ریال باشند.</p>
        </div>
        <span className="currency-pill">IRR · ریال</span>
      </div>

      <div className="file-grid">
        <FileSelector
          id="old-file"
          eyebrow="مبنای مقایسه"
          title="نسخه قدیمی لیست قیمت"
          hint="فایل XLSX · حداکثر ۱۰ مگابایت"
          file={oldFile}
          onChange={onOldFileChange}
          disabled={isSubmitting}
        />
        <FileSelector
          id="new-file"
          eyebrow="نسخه تازه"
          title="نسخه جدید لیست قیمت"
          hint="فایل XLSX · حداکثر ۱۰ مگابایت"
          file={newFile}
          onChange={onNewFileChange}
          disabled={isSubmitting}
        />
      </div>

      {error ? <ComparisonErrorBanner error={error} /> : null}

      <div className="upload-actions">
        <p>
          با شروع مقایسه، فایل‌ها فقط خوانده می‌شوند و محتوای اصلی تغییر
          نمی‌کند.
        </p>
        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting || !oldFile || !newFile}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              در حال استخراج و مقایسه
            </>
          ) : (
            <>
              مقایسه دو نسخه
              <span aria-hidden="true">←</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ComparisonErrorBanner({ error }: { error: ComparisonError }) {
  return (
    <div className="error-banner" role="alert">
      <span aria-hidden="true">!</span>
      <div>
        <strong>امکان مقایسه وجود ندارد</strong>
        <p>{error.message}</p>
        <code>{error.code}</code>
      </div>
    </div>
  );
}
