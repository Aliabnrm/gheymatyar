# قرارداد HTTP فعلی

تمام endpointهای محصول زیر `/api/v1` هستند. پاسخ‌های auth دارای
`Cache-Control: no-store` هستند. مرورگر باید Cookieها را با
`credentials: include` ارسال کند؛ session token هرگز در JSON برگردانده نمی‌شود.

## سلامت

    GET /health/live
    GET /health/ready

پاسخ:

    {"status":"ok"}

`live` به دیتابیس وابسته نیست. `ready` یک `SELECT 1` روی PostgreSQL اجرا می‌کند و
در نبود اتصال، `503 SERVICE_NOT_READY` با قرارداد خطای امن می‌دهد.

## احراز هویت و سازمان جاری

### ثبت‌نام اولیه

    POST /api/v1/auth/register
    Content-Type: application/json

    {
      "email": "owner@example.com",
      "password": "a-secure-password",
      "organization_name": "شرکت نمونه"
    }

User، Organization، membership با نقش OWNER و Session در یک transaction ساخته
می‌شوند. پاسخ `201` context امن زیر و دو `Set-Cookie` دارد. اگر ثبت‌نام عمومی در
تنظیمات خاموش باشد، پاسخ `403 AUTH_REGISTRATION_DISABLED` است. ایمیل تکراری حتی
در race دیتابیس به `409 EMAIL_ALREADY_REGISTERED` تبدیل می‌شود.

### ورود

    POST /api/v1/auth/login

    {"email":"owner@example.com","password":"a-secure-password"}

پاسخ موفق `200` و همان context امن است. ایمیل ناشناخته، password اشتباه و کاربر
غیرفعال همگی `401 AUTH_INVALID_CREDENTIALS` با پیام یکسان دارند. اگر کاربر صفر یا
بیش از یک membership داشته باشد، API سازمانی را تصادفی انتخاب نمی‌کند و
`401 AUTH_CONTEXT_UNAVAILABLE` می‌دهد. پس از پنج شکست در پانزده دقیقه، پاسخ
`429 AUTH_RATE_LIMITED` همراه `Retry-After` برگردانده می‌شود.

برای register و login، اگر مرورگر header `Origin` بفرستد، مقدار آن باید دقیقاً در
allowlist `WEB_ORIGIN` باشد.

### کاربر جاری

    GET /api/v1/auth/me

پاسخ `200`:

    {
      "user": {
        "id": "10d13828-338a-4fc9-8b21-7fe4724935df",
        "email": "owner@example.com"
      },
      "organization": {
        "id": "6c01201c-dbec-4b43-a2e8-f876923441fc",
        "name": "شرکت نمونه"
      },
      "membership": {"role":"OWNER"}
    }

هیچ شناسه یا hash مربوط به Session و CSRF در پاسخ نیست.

### خروج

    POST /api/v1/auth/logout
    X-CSRF-Token: <value of gheymatyar_csrf cookie>

نشست جاری revoke، هر دو Cookie حذف و پاسخ `204` بدون body برگردانده می‌شود.

### Cookieها و CSRF

- `gheymatyar_session`: `HttpOnly`، `SameSite=Lax`، `Path=/` و در production
  دارای `Secure`. `Max-Age` و `Expires` با TTL ثابت نشست، پیش‌فرض هفت روز، هماهنگ‌اند.
- `gheymatyar_csrf`: قابل خواندن توسط frontend، با همان `Secure`، `SameSite`،
  `Path` و عمر. مقدار آن مستقل از session token است.
- برای mutation دارای session، اکنون logout و compare، frontend مقدار Cookie CSRF
  را در `X-CSRF-Token` می‌فرستد. header، Cookie و hash متصل به نشست باید با هم
  برابر باشند؛ در غیر این صورت پاسخ `403 CSRF_VALIDATION_FAILED` است.

## مقایسه دو لیست قیمت

    POST /api/v1/price-lists/compare
    Content-Type: multipart/form-data
    Cookie: gheymatyar_session=...
    X-CSRF-Token: <value of gheymatyar_csrf cookie>

فیلدها:

- old_file: نسخه قدیمی با پسوند XLSX
- new_file: نسخه جدید با پسوند XLSX

محدودیت فعلی هر فایل ۱۰ MiB است.

نمونه curl پس از login و ذخیره Cookieها:

    csrf=$(awk '$6 == "gheymatyar_csrf" {print $7}' cookies.txt)
    curl -b cookies.txt -X POST http://localhost:8000/api/v1/price-lists/compare \
      -H "X-CSRF-Token: $csrf" \
      -F old_file=@fixtures/excel/supplier-price-list-v1-irr.xlsx \
      -F new_file=@fixtures/excel/supplier-price-list-v2-irr.xlsx

## پاسخ موفق

ساختار سطح بالا:

- api_version
- currency که باید IRR باشد
- summary
- items

summary دسته‌های مانعةالجمع و شمارش افزایش/کاهش و high risk را ارائه می‌کند.

هر item شامل:

- product_code
- change_types
- previous و current
- field_changes
- price_delta_irr
- price_change_percent
- is_high_risk

price_change_percent به‌صورت string اعشاری برگردانده می‌شود تا تبدیل float ناخواسته در API رخ ندهد.

## پاسخ خطا

    {
      "error": {
        "code": "INVALID_FILE_TYPE",
        "message": "در نسخه فعلی فقط فایل XLSX پذیرفته می‌شود.",
        "details": {}
      },
      "request_id": "b7f4c2d88ee54f969f647a192f398ddd"
    }

کدهای Auth پایدار فعلی:

- `AUTH_REQUIRED`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_SESSION_EXPIRED`
- `AUTH_CONTEXT_UNAVAILABLE`
- `AUTH_REGISTRATION_DISABLED`
- `EMAIL_ALREADY_REGISTERED`
- `CSRF_VALIDATION_FAILED`
- `AUTH_RATE_LIMITED`

کدهای فایل در `docs/DOMAIN.md` ثبت شده‌اند. message برای نمایش مستقیم فارسی مناسب
است، اما client باید تصمیم برنامه‌نویسی را بر اساس code بگیرد.

این قرارداد برای خطاهای دامنه، اعتبارسنجی FastAPI، مسیر پیدا‌نشده و خطای داخلی یکسان است. جزئیات خطای اعتبارسنجی فقط شامل location، code و message است و مقدار خام ورودی بازگردانده نمی‌شود.

## شناسه درخواست

client می‌تواند header اختیاری `X-Request-ID` شامل حداکثر ۶۴ نویسه حرف، رقم، نقطه، خط تیره، زیرخط، دونقطه بفرستد. مقدار معتبر در header پاسخ و فیلد `request_id` خطا بازگردانده می‌شود. مقدار نامعتبر با شناسه امن سرور جایگزین می‌شود.

برای دسترسی مرورگر، `X-Request-ID` در CORS expose شده است.

## وضعیت HTTP

- 200: ورود، `/auth/me` یا مقایسه موفق
- 201: ثبت‌نام اولیه موفق
- 204: خروج موفق بدون body
- 401: credential یا نشست/context نامعتبر
- 403: ثبت‌نام خاموش، origin نامعتبر، CSRF یا نقش نامعتبر
- 409: ایمیل canonical تکراری
- 413: حجم فایل بیش از حد مجاز
- 422: نوع، ساختار یا داده نامعتبر
- 429: محدودیت تلاش ورود، همراه `Retry-After`
- 503: PostgreSQL برای readiness آماده نیست
- 404: مسیر پیدا نشد
- 500: خطای داخلی امن و قابل رهگیری

## OpenAPI

هنگام اجرای API:

- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

OpenAPI تولیدشده منبع قرارداد transport است. مدل domain مستقل باقی می‌ماند.
