# امنیت و حریم داده

## دارایی‌های حساس

- فایل اصلی تأمین‌کننده
- قیمت خرید و تاریخچه آن
- قواعد سود
- اطلاعات مشتری و پیش‌فاکتور
- عضویت و نقش کاربران
- کلیدهای API و object storage
- audit trail

## مرزهای اعتماد

فایل آپلودی، نام فایل، سلول Excel، PDF، OCR، خروجی Vision، headerهای HTTP و داده فرانت‌اند همگی untrusted هستند.

## کنترل‌های ورودی فایل

- فقط XLSX در برش فعلی
- محدودیت پیش‌فرض ۱۰ MiB برای هر فایل
- کنترل پسوند و ZIP magic bytes
- بررسی ZIP central directory پیش از بازکردن workbook
- محدودیت تعداد entry، مجموع حجم بازشده و نسبت فشرده‌سازی archive
- ردکردن archive رمزگذاری‌شده
- بازکردن read-only و data-only
- عدم اجرای macro و formula
- محدودیت قابل تنظیم تعداد worksheet، ردیف و ستون
- ردکردن صریح فایل عبورکرده از محدودیت به‌جای قطع بی‌صدای ردیف‌ها
- پاک‌سازی نام فایل پیش از قراردادن در جزئیات خطا
- بستن UploadFileها در پایان درخواست، حتی هنگام خطا
- timeout و memory limit در worker
- نام object تصادفی؛ نام کاربر فقط metadata
- hash فایل برای idempotency و ممیزی

محافظت اولیه archive bomb پیاده‌سازی شده است. timeout سخت پردازش، memory limit سطح process، اسکن بدافزار و ذخیره امن فایل اصلی مربوط به مرحله import پایدار هستند.

## کنترل‌های HTTP فعلی

- CORS فقط برای origin تنظیم‌شده و localhost در development
- پذیرش و تولید request ID با الگوی محدود
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- HSTS فقط در production؛ TLS باید در reverse proxy فعال باشد
- پاسخ خطای داخلی بدون stack trace یا پیام exception

## Tenancy

- هر داده persisted دارای organization_id است.
- organization جاری از session معتبر استخراج می‌شود.
- شناسه ارسالی client مجوز دسترسی محسوب نمی‌شود.
- تست negative برای دسترسی tenant دیگر الزامی است.
- query بدون tenant scope در repository چندسازمانی ممنوع است.

## Authentication و نقش‌ها

مرحله persistence:

- session امن HttpOnly
- CSRF protection برای cookie auth
- roleهای owner، admin، sales و reviewer
- approval و تغییر rule نیازمند permission مشخص
- rate limit برای login و upload

## Secrets

- secret در Git، image یا log قرار نمی‌گیرد.
- فایل .env فقط محلی و ignore است.
- production از secret manager استفاده می‌کند.
- کلیدها قابل rotation هستند.

## Logging

مجاز:

- request id
- organization id داخلی
- زمان پردازش
- تعداد ردیف
- error code
- file hash کوتاه‌شده

غیرمجاز:

- کل محتوای فایل
- dump ردیف‌های قیمت
- token، password و API key
- داده شخصی مشتری

## AI و Prompt Injection

در مراحل PDF/تصویر، متن سند ممکن است دستور مخرب داشته باشد. محتوای سند data است، نه instruction. مدل فقط schema محدود تولید می‌کند و هیچ tool یا مجوز انتشار ندارد. خروجی مدل باید validate و توسط انسان approve شود.

## پاسخ به رخداد

پیش از پایلوت عمومی باید موارد زیر وجود داشته باشد:

- مالک رخداد و کانال گزارش
- امکان revoke session و rotate secret
- backup و restore آزموده‌شده
- ثبت access و approval
- رویه اطلاع‌رسانی متناسب با نوع داده

## چک‌لیست انتشار

- dependency scan
- secret scan
- تست tenant isolation
- upload limits
- secure headers و CORS محدود
- TLS
- backup/restore
- خطا بدون stack trace
- حساب admin بدون رمز پیش‌فرض
