"use client";

import { usePriceListComparison } from "../hooks/use-price-list-comparison";
import { ComparisonResults } from "./comparison-results";
import { UploadPanel } from "./upload-panel";

export function ComparisonWorkspace() {
  const comparison = usePriceListComparison();
  const isSubmitting = comparison.request.status === "submitting";
  const error =
    comparison.request.status === "failure" ? comparison.request.error : null;

  return (
    <div className="container workspace">
      <UploadPanel
        oldFile={comparison.oldFile}
        newFile={comparison.newFile}
        error={error}
        isSubmitting={isSubmitting}
        onOldFileChange={comparison.setOldFile}
        onNewFileChange={comparison.setNewFile}
        onSubmit={() => void comparison.compare()}
      />

      {comparison.result ? (
        <ComparisonResults
          result={comparison.result}
          filter={comparison.filter}
          visibleItems={comparison.visibleItems}
          onFilterChange={comparison.setFilter}
        />
      ) : (
        <EmptyComparisonState isSubmitting={isSubmitting} />
      )}
    </div>
  );
}

function EmptyComparisonState({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <section className="empty-preview" aria-hidden={isSubmitting}>
      <div className="empty-preview__illustration">
        <span>نسخه قدیم</span>
        <b>⇄</b>
        <span>نسخه جدید</span>
      </div>
      <div>
        <h2>نتیجه مقایسه اینجا نمایش داده می‌شود</h2>
        <p>
          ابتدا دو فایل XLSX را انتخاب کنید. فایل‌های ماک پروژه برای اولین
          آزمایش آماده‌اند.
        </p>
      </div>
    </section>
  );
}
