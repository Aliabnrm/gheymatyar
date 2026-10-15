const integerFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 2,
});

export function formatIrr(value: number | null): string {
  if (value === null) return "—";
  return integerFormatter.format(value) + " ریال";
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatPaginationRange(offset: number, limit: number, total: number): string {
  if (total === 0) return "۰ مورد";
  if (offset >= total) return `${formatInteger(total)} مورد؛ به صفحه قبل برگردید.`;
  return `${formatInteger(offset + 1)} تا ${formatInteger(Math.min(offset + limit, total))} از ${formatInteger(total)}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});
export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatPriceDelta(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return sign + integerFormatter.format(value) + " ریال";
}

export function formatPercent(value: string | null): string {
  if (value === null) return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  const sign = number > 0 ? "+" : "";
  return sign + percentFormatter.format(number) + "٪";
}
