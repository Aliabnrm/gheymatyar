# نقشه راه

## مرحله ۰ — مسئله و داده آزمون

وضعیت: انجام‌شده.

- صنف هدف
- اسناد محصول
- قرارداد داده
- دو Excel ماک
- ground truth

## مرحله ۱ — مقایسه Full-stack

وضعیت: انجام‌شده.

- Domain مستقل
- Excel extractor
- FastAPI multipart endpoint
- داشبورد RTL
- fixture regression
- CI

تعریف پایان: کاربر بدون ترمینال دو fixture را انتخاب کند و نتیجه صحیح را ببیند.

## مرحله ۲ — Persistence، هویت و Import پایدار

وضعیت: foundation، Supplier، Import Draft، نگاشت، Version تغییرناپذیر و Approval
انجام‌شده‌اند.

ترتیب اجرایی این مرحله عمداً چنین است:

1. PostgreSQL و Alembic migration — انجام‌شده
2. Auth امن با session سمت سرور — انجام‌شده
3. Organization Membership و نقش‌های OWNER/OPERATOR — انجام‌شده
4. Supplier — انجام‌شده
5. SourceDocument، ImportRun، ExtractedRows و نگهداری فایل اصلی — انجام‌شده
6. template و اصلاح نگاشت ستون — انجام‌شده
7. PriceListVersion و مقایسه با آخرین نسخه ثبت‌شده — انجام‌شده
8. Approval، Reject، Current Price و Audit Log — انجام‌شده
9. گزارش اثر Version آماده بررسی بر Current تأییدشده و اتصال مبنا به Approval — انجام‌شده

مقایسه XLSX فعلی فقط پس از احراز هویت قابل استفاده و همچنان stateless است. مسیر
مستقل Import فایل اصلی، metadata و ردیف‌های canonical را نگه می‌دارد. ساخت
PriceListVersion با اقدام صریح ساخته می‌شود و فقط OWNER می‌تواند آخرین نسخه را پس
از بازبینی تأیید و به قیمت جاری تبدیل کند.
پیش از Approval، صفحه Version گزارش تاریخی predecessor و گزارش عملیاتی Current را
با مبناهای روشن و pin هم‌زمانی جدا نمایش می‌دهد. این تکمیل همان جریان Approval است
و دامنه Sprint 6 جست‌وجوی عملیاتی را جلو نمی‌اندازد.

## مرحله ۳ — پردازش background

- Redis و Celery
- idempotency اجرایی job و retry توزیع‌شده
- retry و timeout
- progress
- observability

## مرحله ۴ — پایلوت Excel

- ده فایل واقعی بی‌نام
- سه تأمین‌کننده
- field-level accuracy
- مصاحبه usability
- تعهد تجاری

## مرحله ۵ — قواعد قیمت و پیش‌فاکتور

- markup و target margin مستقل
- rule مشتری و گروه کالا
- PDF فارسی
- quote price-version reference
- stale quote risk

## مرحله ۶ — PDF و تصویر

- PDF متن‌دار
- OCR محلی
- Vision structured output
- confidence و human review
- provider abstraction

## مرحله ۷ — پیگیری

- reminder rule-based
- notification logs
- متن پیشنهادی AI
- هیچ ارسال خودکار در شروع
