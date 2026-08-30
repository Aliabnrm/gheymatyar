# ADR 0005: نشست امن سمت سرور و Context سازمانی

- Status: Accepted
- Date: 2026-08-28

## Context

تا پیش از persistence، endpoint مقایسه XLSX عمومی و runtime تقریباً stateless
بود. با ورود PostgreSQL و داده واقعی مشتری، هویت کاربر و مرز سازمان باید پیش از
Supplier، فایل و PriceListVersion تثبیت شود. Browser نباید token قابل خواندن و
ماندگار در JavaScript داشته باشد و `organization_id` ارسالی client نباید مدرک
مجوز باشد.

## Decision

- PostgreSQL منبع حقیقت User، Organization، Membership و Session است.
- Browser از opaque server-side Session استفاده می‌کند؛ JWT و browser storage
  برای token استفاده نمی‌شوند.
- password با Argon2id و کتابخانه معتبر hash می‌شود و عملیات CPU-bound خارج از
  event loop اجرا می‌شود.
- Session token و CSRF token مستقل و هرکدام دارای حداقل ۳۲ بایت entropy هستند.
  فقط SHA-256 tokenها در دیتابیس ذخیره می‌شود.
- Session token در Cookie با `HttpOnly`، `SameSite=Lax`، `Path=/` و در production
  `Secure` قرار می‌گیرد. CSRF Cookie HttpOnly نیست تا frontend آن را در
  `X-CSRF-Token` بفرستد؛ header، Cookie و hash Session با constant-time comparison
  بررسی می‌شوند.
- هر Session به `organization_id` جاری bind می‌شود. اعتبار هر درخواست نیازمند
  Session فعال، User فعال و Membership دقیق همان user و organization است.
- login فقط وقتی Session می‌سازد که کاربر دقیقاً یک Membership داشته باشد؛
  انتخاب و تعویض سازمان خارج از این slice است.
- نقش‌های MVP فقط `OWNER` و `OPERATOR` هستند. هر دو به compare دسترسی دارند؛
  approval و مدیریت عضو بعداً افزوده می‌شوند.
- registration عمومی setting دارد و در production به‌صورت پیش‌فرض خاموش است.
  onboarding production از CLI با password بدون echo و همان Register use case
  انجام می‌شود.
- limiter ورود برای pilot تک‌پردازه، bounded و حافظه‌ای است. Redis در این slice
  اضافه نمی‌شود.

## Consequences

- XSS نمی‌تواند Session token HttpOnly را مستقیماً بخواند و سرقت token از storage
  جاوااسکریپت حذف می‌شود.
- revoke فوری، expiry ثابت و ابطال نشست پس از حذف membership در سمت سرور ممکن است.
- هر repository داده سازمانی آینده باید `organization_id` معتبر current context
  را در امضای متد الزامی کند.
- هر درخواست auth یک query PostgreSQL دارد و availability دیتابیس برای readiness
  لازم است.
- SameSite به CSRF token متصل به Session تکمیل می‌شود؛ استقرار production باید
  HTTPS و site سازگار داشته باشد.
- login limiter بین processها state مشترک ندارد. پیش از scale افقی یا انتشار
  عمومی باید reverse-proxy rate limit یا adapter توزیع‌شده جایگزین/تکمیل شود.
- کاربر با چند Membership تا زمان ساخت organization switcher نمی‌تواند login کند.

## Rejected alternatives

- **JWT در localStorage/sessionStorage:** به‌دلیل دسترسی JavaScript، افزایش اثر
  XSS و پیچیدگی revoke/refresh رد شد.
- **JWT در Cookie:** برای نیاز فعلی مزیتی نسبت به Session opaque و revokeپذیر
  ندارد و مدیریت CSRF را حذف نمی‌کند.
- **انتخاب organization از request body یا header:** client-controlled و ناقض
  tenant isolation است.
- **انتخاب خودکار اولین Membership:** رفتار مبهم و مستعد دسترسی به سازمان اشتباه
  است.
- **RBAC/permission builder قابل تنظیم:** برای دو نقش فعلی پیچیدگی زودهنگام است.
- **Redis rate limiter:** تا زمانی که pilot تک‌پردازه است dependency عملیاتی
  اضافه‌ای بدون نیاز اثبات‌شده ایجاد می‌کند.
