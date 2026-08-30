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

وضعیت: زیرمرحله foundation انجام‌شده؛ persistence داده‌های قیمت هنوز شروع نشده است.

ترتیب اجرایی این مرحله عمداً چنین است:

1. PostgreSQL و Alembic migration — انجام‌شده
2. Auth امن با session سمت سرور — انجام‌شده
3. Organization Membership و نقش‌های OWNER/OPERATOR — انجام‌شده
4. Supplier — شروع‌نشده
5. PriceListVersion و نگهداری فایل اصلی — شروع‌نشده
6. import state machine و template نگاشت ستون — شروع‌نشده
7. Draft، Approval و Audit Log — شروع‌نشده

مقایسه XLSX فعلی فقط پس از احراز هویت قابل استفاده است، اما فایل و نتیجه مقایسه
هنوز ذخیره نمی‌شوند. Supplier، فایل و approval پیش از تکمیل زیرمرحله مربوطه به
این foundation اضافه نمی‌شوند.

## مرحله ۳ — پردازش background

- Redis و Celery
- idempotency
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
