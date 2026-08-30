# راهبرد تست

## هدف

تست‌ها باید از اعتماد محصول محافظت کنند، نه فقط درصد coverage. خطای قیمت، واحد یا بسته‌بندی از خطای ظاهری پرهزینه‌تر است.

## لایه‌ها

### Unit

- نرمال‌سازی فارسی و کد
- parse قیمت ریالی
- mapping موجودی
- الگوریتم diff
- محاسبه درصد با Decimal
- invariantهای PriceListItem
- اعتبارسنجی تنظیمات و origin
- canonical email، password policy و نام سازمان
- Argon2id verify/rehash و اجرای adapter async
- entropy و hash-only بودن Session/CSRF token
- fixed session expiry، role guard و CSRF binding
- login limiter expiry، clear و bounded cleanup

### Fixture regression

دو فایل fixtures/excel باید همیشه summary ثبت‌شده در fixtures/expected را تولید کنند. این تست مهم‌ترین قرارداد فعلی است.

### API integration

- health
- multipart happy path
- پسوند نامعتبر
- امضای نامعتبر
- فایل بزرگ
- ستون گمشده
- خطای قابل فهم فارسی
- قرارداد ثابت validation، 404 و 500
- انتشار و پاک‌سازی request id
- اعمال تنظیمات app factory روی محدودیت upload
- اجرای استخراج XLSX خارج از thread حلقه async
- register اتمیک و conflict ایمیل بدون رکورد orphan
- login موفق و خطای عمومی email/password/user غیرفعال
- session منقضی، revokeشده و logout فقط نشست جاری
- `/auth/me` و حذف membership سازمانی
- Cookie flagها، CSRF missing/mismatch و Origin/CORS
- عدم انتخاب تصادفی membership چندسازمانی
- 429 و `Retry-After`
- readiness موفق و شکست امن PostgreSQL

### PostgreSQL integration

تست persistence فقط روی PostgreSQL اجرا می‌شود و SQLite جایگزین آن نیست. پیش از
pytest، migration با `alembic upgrade head` اجرا می‌شود. تست‌ها constraintهای
unique، FK، role CHECK و timestamp timezone-aware را روی schema واقعی بررسی
می‌کنند. CI یک PostgreSQL 17 service سالم دارد، migration را اجرا و سپس test suite
را آغاز می‌کند.

### File security

- سقف ردیف، ستون و worksheet
- سقف مجموع حجم بازشده archive
- ردکردن صریح فایل عبورکرده از محدودیت
- پاک‌سازی filename traversal

### Frontend

- format ریال
- انتخاب فایل و validation
- loading و disabled state
- summary
- فیلتر جدول
- نمایش error
- `credentials: include` و CSRF header فقط برای mutationهای session-authenticated
- Zod schemaهای register/login/me
- فرم‌های login/register در validation، loading، success و خطاهای پایدار
- auth bootstrap و protected dashboard بدون نمایش زودهنگام workspace
- logout، پاک‌سازی cache و redirect ثابت هنگام 401/session expiration
- policy عدم استفاده از localStorage/sessionStorage برای auth

### End-to-End

پس از پایدارشدن محیط:

1. بازکردن داشبورد
2. انتخاب V1 و V2
3. اجرای مقایسه
4. کنترل summary
5. کنترل تغییر pack size

## Quality gates

Backend:

    cd backend
    uv run alembic upgrade head
    uv run alembic check
    uv run ruff format --check app tests
    uv run ruff check app tests
    uv run mypy app
    uv run pytest

Frontend:

    pnpm format:check
    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm build

## Coverage

عدد coverage به‌تنهایی معیار پذیرش نیست. حداقل پیشنهادی برای domain برابر ۹۰٪ branch coverage است. presentation می‌تواند کمتر باشد به شرط تست رفتارهای پرریسک.

## Fixture policy

- فایل‌ها باید ساختگی یا بی‌نام باشند.
- قیمت واقعی یا داده مشتری بدون اجازه وارد Git نمی‌شود.
- هر bug استخراج مهم یک regression fixture کوچک می‌گیرد.
- fixture بزرگ فقط وقتی نگه داشته می‌شود که حالت واقعی را پوشش دهد.

## تست‌های امنیتی الزامی آینده

- tenant escape
- formula injection در export
- timeout OCR/Vision
- prompt injection در سند

tenant escape مربوط به entityهای سازمانی مانند Supplier هم‌زمان با اضافه‌شدن آن
repositoryها افزوده می‌شود. در foundation فعلی، session با organization یا
membership نامعتبر و membership مبهم پوشش داده شده است.
