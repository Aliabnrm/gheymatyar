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
