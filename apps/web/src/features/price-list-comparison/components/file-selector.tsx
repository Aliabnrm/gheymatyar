import type { ChangeEvent } from "react";

interface FileSelectorProps {
  id: string;
  eyebrow: string;
  title: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function FileSelector({
  id,
  eyebrow,
  title,
  hint,
  file,
  onChange,
  disabled = false,
}: FileSelectorProps) {
  const hintId = id + "-hint";

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
  }

  return (
    <label
      className={"file-card" + (file ? " file-card--selected" : "")}
      htmlFor={id}
      aria-disabled={disabled}
    >
      <span className="file-card__eyebrow">{eyebrow}</span>
      <span className="file-card__icon" aria-hidden="true">
        {file ? "✓" : "↑"}
      </span>
      <span className="file-card__title">{file?.name ?? title}</span>
      <span className="file-card__hint" id={hintId}>
        {file ? formatFileSize(file.size) : hint}
      </span>
      <span className="file-card__action">
        {file ? "تغییر فایل" : "انتخاب فایل XLSX"}
      </span>
      <input
        id={id}
        className="visually-hidden"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-describedby={hintId}
        onChange={handleChange}
        disabled={disabled}
      />
    </label>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " بایت";
  if (bytes < 1024 * 1024) return Math.ceil(bytes / 1024) + " کیلوبایت";
  return (bytes / (1024 * 1024)).toFixed(1) + " مگابایت";
}
