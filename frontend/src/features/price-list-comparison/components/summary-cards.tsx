import { formatInteger } from "@/utils/format";

import type { ComparisonSummary } from "../model/types";

interface SummaryCardsProps {
  summary: ComparisonSummary;
}

const cards: ReadonlyArray<{
  key: keyof ComparisonSummary;
  label: string;
  tone: string;
  detail: (summary: ComparisonSummary) => string;
}> = [
  {
    key: "price_changed",
    label: "تغییر قیمت",
    tone: "amber",
    detail: (summary) =>
      formatInteger(summary.price_increased) +
      " افزایش · " +
      formatInteger(summary.price_decreased) +
      " کاهش",
  },
  {
    key: "added",
    label: "کالای جدید",
    tone: "green",
    detail: () => "در نسخه جدید اضافه شده",
  },
  {
    key: "removed",
    label: "حذف‌شده",
    tone: "rose",
    detail: () => "در نسخه جدید دیده نشد",
  },
  {
    key: "high_risk",
    label: "نیازمند توجه",
    tone: "violet",
    detail: () => "تغییر واحد یا تعداد بسته",
  },
  {
    key: "metadata_only_changed",
    label: "تغییر اطلاعات",
    tone: "blue",
    detail: () => "بدون تغییر قیمت",
  },
  {
    key: "unchanged",
    label: "بدون تغییر",
    tone: "slate",
    detail: () => "کاملاً یکسان",
  },
];

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="summary-grid" aria-label="خلاصه مقایسه">
      {cards.map((card) => (
        <article
          className={"summary-card summary-card--" + card.tone}
          key={card.key}
        >
          <p>{card.label}</p>
          <strong>{formatInteger(summary[card.key])}</strong>
          <span>{card.detail(summary)}</span>
        </article>
      ))}
    </div>
  );
}
