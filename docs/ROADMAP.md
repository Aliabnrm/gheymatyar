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

وضعیت: foundation، Supplier و Import Draft پایدار انجام‌شده‌اند؛ versioning و
approval هنوز شروع نشده‌اند.

ترتیب اجرایی این مرحله عمداً چنین است:

1. PostgreSQL و Alembic migration — انجام‌شده
2. Auth امن با session سمت سرور — انجام‌شده
3. Organization Membership و نقش‌های OWNER/OPERATOR — انجام‌شده
4. Supplier — انجام‌شده
5. SourceDocument، ImportRun، ExtractedRows و نگهداری فایل اصلی — انجام‌شده
6. template و اصلاح نگاشت ستون — شروع‌نشده
7. PriceListVersion و مقایسه با آخرین نسخه approved — شروع‌نشده
8. Draft نسخه، Approval و Audit Log — شروع‌نشده

مقایسه XLSX فعلی فقط پس از احراز هویت قابل استفاده و همچنان stateless است. مسیر
مستقل Import فایل اصلی، metadata و ردیف‌های canonical را نگه می‌دارد، اما هیچ
Importی هنوز PriceListVersion جاری یا approved ایجاد نمی‌کند.

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
