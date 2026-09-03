import { ComparisonWorkspace } from "./comparison-workspace";

export function PriceListComparisonPage() {
  return (
    <>
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
