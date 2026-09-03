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

- CORS با `allow_credentials` فقط برای origin تنظیم‌شده و localhost در development
- Origin allowlist برای register/login مرورگری
- session سمت سرور، Cookie HttpOnly و CSRF متصل به نشست
- پذیرش و تولید request ID با الگوی محدود
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- HSTS فقط در production؛ TLS باید در reverse proxy فعال باشد
- پاسخ خطای داخلی بدون stack trace یا پیام exception

## Tenancy

- Session دارای `organization_id` است و به یک سازمان جاری متصل می‌شود.
- organization جاری از session معتبر و membership متناظر استخراج می‌شود.
- شناسه ارسالی client مجوز دسترسی محسوب نمی‌شود.
- در هر درخواست، user فعال و membership همان user و `session.organization_id`
  دوباره از PostgreSQL خوانده می‌شوند.
- login فقط برای دقیقاً یک membership نشست می‌سازد؛ انتخاب تصادفی ممنوع است.
- تست negative برای دسترسی tenant دیگر الزامی است.
- query بدون tenant scope در repository چندسازمانی ممنوع است.
- تمام متدهای Supplier repository، `organization_id` جاری را اجباری دریافت و
  شرط آن را داخل SQL اعمال می‌کنند. شناسه tenant دیگر مانند شناسه ناموجود پاسخ
  داده می‌شود.

## Authentication و نقش‌ها

نقش‌های MVP فقط `OWNER` و `OPERATOR` هستند. این محدودیت در enum دامنه، schema
API، CHECK constraint دیتابیس و role guard اعمال می‌شود. هر دو نقش می‌توانند فایل
XLSX را مقایسه کنند. approval و مدیریت عضو هنوز پیاده‌سازی نشده‌اند.

کنترل دسترسی Supplier:

در Supplier، هر دو نقش list/detail را می‌خوانند اما فقط OWNER مجاز به create،
rename و تغییر وضعیت است. POST/PATCH علاوه بر role guard به CSRF معتبر نیاز دارند.
غیرفعال‌سازی جایگزین حذف سخت است تا هویت و ارجاع تاریخی آینده حفظ شود.

کنترل‌های Auth پیاده‌سازی‌شده:

- password با Argon2id و کتابخانه `argon2-cffi` hash می‌شود؛ حد ۱۲ تا ۱۲۸ نویسه
  پیش از Argon2 کنترل و hash/verify در threadpool اجرا می‌شود.
- برای ایمیل ناشناخته dummy verification انجام می‌شود و پیام email ناشناخته،
  password اشتباه و user غیرفعال یکسان است.
- Session یک token opaque با حداقل ۳۲ بایت entropy دارد؛ فقط SHA-256 آن در
  PostgreSQL است و token خام فقط در `gheymatyar_session` HttpOnly Cookie قرار می‌گیرد.
- CSRF token مستقل است؛ فقط hash آن کنار Session ذخیره و مقدار خام در
  `gheymatyar_csrf` قابل خواندن frontend قرار می‌گیرد.
- Cookieها `SameSite=Lax` و `Path=/` هستند؛ در production به‌صورت پیش‌فرض
  `Secure` و در development/test برای HTTP محلی بدون Secure هستند.
- TTL ثابت و پیش‌فرض هفت روز است؛ sliding session، JWT، refresh token و storage
  جاوااسکریپت وجود ندارد.
- logout فقط نشست جاری را با `revoked_at` می‌بندد و هر دو Cookie را حذف می‌کند.
- register در production به‌صورت پیش‌فرض خاموش است. onboarding مالک با command
  `gheymatyar-create-owner`، password بدون echo و همان use case ثبت‌نام انجام می‌شود.

برای درخواست‌های unsafe مبتنی بر Session، SameSite به‌تنهایی کافی نیست. logout و
compare باید Cookie CSRF، header `X-CSRF-Token` و hash همان Session را با مقایسه
constant-time معتبر کنند. نبودن یا mismatch بدون نمایش token با 403 رد می‌شود.

استقرار production باید frontend و API را روی HTTPS و site سازگار با
`SameSite=Lax` ارائه کند. `WEB_ORIGIN` باید origin دقیق frontend باشد و wildcard
مجاز نیست. TLS/HSTS در reverse proxy پایان می‌یابد؛ Cookie session Domain ندارد.

## کنترل brute force

login limiter فعلی برای پایلوت تک‌پردازه طراحی شده است:

- کلید، SHA-256 ترکیب IP مستقیم `request.client` و ایمیل canonical/casefold است؛
  raw email ذخیره نمی‌شود.
- `X-Forwarded-For` بدون trusted-proxy configuration خوانده نمی‌شود.
- پیش‌فرض پنج شکست در پانزده دقیقه، حافظه bounded و پاک‌سازی entry منقضی است.
- موفقیت شمارنده همان کلید را پاک می‌کند و پاسخ محدودشده 429 و `Retry-After` دارد.

این limiter بین processها یا hostها توزیع‌شده نیست. پیش از scale افقی یا انتشار
عمومی، rate limit در reverse proxy یا adapter توزیع‌شده لازم است. Redis صرفاً برای
حل این مسئله وارد runtime این slice نشده است.

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
- ساخت OWNER اولیه با password اختصاصی و ثبت‌نام عمومی خاموش
- `AUTH_COOKIE_SECURE=true` و HTTPS/site سازگار
- rate limit توزیع‌شده یا reverse-proxy پیش از scale افقی
