import Link from "next/link";

import { ComparisonWorkspace } from "./comparison-workspace";

export function PriceListComparisonPage() {
  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <Link className="brand" href="/" aria-label="قیمت‌یار، صفحه اصلی">
            <span className="brand__mark" aria-hidden="true">
              ق
            </span>
            <span>
              <strong>قیمت‌یار</strong>
              <small>دستیار قیمت عمده‌فروشی</small>
            </span>
          </Link>
          <div className="topbar__status">
            <span className="status-dot" aria-hidden="true" />
            محیط آزمایشی · تمام مبالغ ریال
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__glow" aria-hidden="true" />
          <div className="container hero__content">
            <p className="eyebrow">نسخه آزمایشی مقایسه Excel</p>
            <h1>
              تغییر قیمت را پیدا کنید،
              <span> قبل از اینکه حاشیه سودتان تغییر کند.</span>
            </h1>
            <p className="hero__lead">
              دو نسخه لیست قیمت یک تأمین‌کننده را انتخاب کنید. قیمت‌یار کالاهای
              جدید، حذف‌شده، تغییر قیمت و تغییر تعداد بسته را جداگانه نشان
              می‌دهد.
            </p>
            <div className="trust-row" aria-label="ویژگی‌های اعتماد">
              <span>بدون تغییر فایل اصلی</span>
              <span>مقایسه قطعی بر اساس کد کالا</span>
              <span>بدون استفاده از AI برای Excel</span>
            </div>
          </div>
        </section>

        <ComparisonWorkspace />
      </main>

      <footer>
        <div className="container">
          <span>قیمت‌یار · MVP مهندسی مقایسه قیمت</span>
          <span>هیچ نسخه‌ای بدون تأیید انسان منتشر نمی‌شود.</span>
        </div>
      </footer>
    </>
  );
}
