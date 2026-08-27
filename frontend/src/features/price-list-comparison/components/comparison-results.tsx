import { formatInteger } from "@/utils/format";

import { RESULT_FILTERS } from "../model/filters";
import type {
  ComparisonItem,
  ComparisonResponse,
  ResultFilter,
} from "../model/types";
import { ComparisonTable } from "./comparison-table";
import { SummaryCards } from "./summary-cards";

interface ComparisonResultsProps {
  result: ComparisonResponse;
  filter: ResultFilter;
  visibleItems: readonly ComparisonItem[];
  onFilterChange: (filter: ResultFilter) => void;
}

export function ComparisonResults({
  result,
  filter,
  visibleItems,
  onFilterChange,
}: ComparisonResultsProps) {
  return (
    <section className="results" aria-live="polite">
      <div className="section-heading results__heading">
        <div>
          <span className="step-label step-label--done">
            گام ۲ از ۲ · آماده
          </span>
          <h2>نتیجه مقایسه</h2>
          <p>
            {formatInteger(result.summary.old_items)} ردیف قدیم با{" "}
            {formatInteger(result.summary.new_items)} ردیف جدید مقایسه شد.
          </p>
        </div>
        <div className="result-assurance">
          <span aria-hidden="true">✓</span>
          قیمت‌ها به ریال تحلیل شدند
        </div>
      </div>

      <SummaryCards summary={result.summary} />

      <div className="results-panel">
        <div className="filter-bar">
          <div>
            <strong>جزئیات کالاها</strong>
            <span>{formatInteger(visibleItems.length)} ردیف</span>
          </div>
          <div className="filter-list" role="group" aria-label="فیلتر نتیجه">
            {RESULT_FILTERS.map((option) => (
              <button
                className={
                  filter === option.id ? "filter-chip is-active" : "filter-chip"
                }
                type="button"
                key={option.id}
                onClick={() => onFilterChange(option.id)}
                aria-pressed={filter === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <ComparisonTable items={visibleItems} />
      </div>

      <aside className="risk-note">
        <span className="risk-note__icon" aria-hidden="true">
          !
        </span>
        <div>
          <strong>تغییر بسته یا واحد را فقط با درصد قیمت قضاوت نکنید.</strong>
          <p>
            در این حالت ممکن است قیمت بسته کاهش یافته باشد اما تعداد داخل آن نیز
            تغییر کرده باشد. این موارد با برچسب «نیازمند توجه» مشخص شده‌اند.
          </p>
        </div>
      </aside>
    </section>
  );
}
