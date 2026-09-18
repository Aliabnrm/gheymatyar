const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

export function formatImportDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${numberFormatter.format(sizeBytes)} بایت`;
  if (sizeBytes < 1024 * 1024) {
    return `${numberFormatter.format(sizeBytes / 1024)} کیلوبایت`;
  }
  return `${numberFormatter.format(sizeBytes / (1024 * 1024))} مگابایت`;
}
