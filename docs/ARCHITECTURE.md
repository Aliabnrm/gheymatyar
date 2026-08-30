# معماری سیستم

## سبک معماری

سیستم با Modular Monolith شروع می‌شود. مرزها ماژولی‌اند اما همه در یک deployable backend باقی می‌مانند. این انتخاب هزینه هماهنگی، عملیات و تراکنش را پایین نگه می‌دارد و امکان جداسازی آینده را بدون تحمیل پیچیدگی زودهنگام حفظ می‌کند.

## اجزای زمان اجرا

    Browser
       |
       | HTTPS / JSON + multipart
       v
    Next.js Web
       |
       v
    FastAPI Modular Monolith
       |-- API composition, health and shared HTTP errors
       |-- accounts module
       |   |-- users, organizations and memberships
       |   +-- opaque sessions and organization context
       |-- price_lists module
       |   |-- presentation
       |   |-- application
       |   |-- domain
       |   +-- XLSX infrastructure
       +-- SQLAlchemy AsyncSession / asyncpg
                 |
                 v
             PostgreSQL 17+

PostgreSQL منبع persistence فعال حساب‌ها و نشست‌ها است. مقایسه XLSX همچنان
درخواست‌محور و بدون ذخیره فایل یا نتیجه انجام می‌شود؛ persistence تأمین‌کننده و
لیست قیمت به زیرمرحله بعدی موکول است.

## قانون وابستگی

    presentation -> application -> domain
    infrastructure -> application/domain ports

Domain نباید FastAPI، SQLAlchemy، openpyxl، Redis، S3 یا SDK مدل AI را import کند.

## ماژول‌های پیاده‌سازی‌شده بک‌اند

### accounts

- مدل‌های مستقل User، Organization، Membership و Session context
- validation ایمیل، password و نام سازمان در application/domain boundary
- use caseهای register، login، logout، current account و CSRF validation
- portهای صریح password، token و account store
- adapterهای Argon2id، token امن و SQLAlchemy
- presentation شامل Cookie، origin validation، role guard و routeهای auth

هیچ مدل domain به FastAPI، Pydantic، SQLAlchemy، Argon2 یا asyncpg وابسته نیست.

### price_lists

- مدل استاندارد ردیف
- نرمال‌سازی
- اعتبارسنجی
- الگوریتم مقایسه
- انواع تغییر

دریافت امن فایل جزئی از مرز presentation همین قابلیت است؛ تا زمانی که چرخه import
مستقل و persistence فایل نداریم، ماژول جداگانه‌ای برای imports ساخته نمی‌شود.
suppliers و quotations هنوز کد یا جدول ندارند.

## راه‌اندازی برنامه و مرزهای مشترک

`create_app(settings)` یک engine و `async_sessionmaker` برای عمر برنامه می‌سازد و
آن‌ها را همراه تنظیمات و سرویس‌های accounts در composition root قرار می‌دهد.
برای هر عملیات repository یک AsyncSession کوتاه و transaction صریح باز می‌شود؛
engine یا pool در هر درخواست دوباره ساخته نمی‌شود. `pool_pre_ping` و timeout
قابل تنظیم‌اند و در تست از `NullPool` برای جداسازی event loopها استفاده می‌شود.
lifespan در shutdown engine را dispose می‌کند. migration خودکار در startup وجود
ندارد و Alembic باید پیش از استقرار اجرا شود.

لایه مشترک HTTP مسئول موارد زیر است:

- router ریشه و نسخه v1
- health response صریح
- CORS محدود به originهای معتبر
- request ID و headerهای امنیتی
- log ساختاریافته JSON
- تبدیل مرکزی خطاها به قرارداد پایدار

## جریان مقایسه فعلی

1. Web نشست HttpOnly را همراه CSRF header می‌فرستد.
2. API hash token را محاسبه و در یک query نشست، کاربر فعال، عضویت دقیق و سازمان
   متصل به نشست را بازیابی می‌کند.
3. role guard فقط OWNER و OPERATOR را می‌پذیرد.
4. API اندازه، پسوند و امضای ZIP دو فایل multipart را کنترل می‌کند.
5. API پردازش هم‌گام openpyxl را به threadpool محدود Starlette می‌سپارد.
6. extraction و مقایسه قطعی اجرا و پاسخ نسخه‌دار برگردانده می‌شود.
7. هر دو UploadFile در پایان، حتی هنگام خطا، بسته می‌شوند.

## جریان Session تا سازمان جاری

    Cookie gheymatyar_session (token خام)
        -> SHA-256
        -> Session فعال، منقضی‌نشده و revokeنشده
        -> User فعال
        -> Membership(user_id, session.organization_id)
        -> Organization
        -> CurrentAccountContext تایپ‌شده

`organization_id` ورودی client هیچ‌گاه مدرک authorization نیست. Session آگاهانه
به یک سازمان متصل است و membership در هر درخواست دوباره از PostgreSQL خوانده
می‌شود. login فقط برای دقیقاً یک membership نشست می‌سازد؛ انتخاب یا تعویض سازمان
هنوز وجود ندارد.

## مسیر persistence

جدول‌های موجود:

- organizations
- users
- organization_memberships
- sessions

جدول‌های زیرمرحله‌های بعد:

- suppliers
- documents
- extraction_runs
- extracted_rows
- price_lists
- price_list_versions
- price_list_items
- price_changes
- audit_logs

نسخه‌ها immutable هستند. اصلاح یک نسخه تأییدشده، نسخه جدید می‌سازد.

## API

- GET /health/live
- GET /health/ready
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- GET /api/v1/auth/me
- POST /api/v1/price-lists/compare

`live` عمومی و مستقل از دیتابیس است؛ `ready` با `SELECT 1` PostgreSQL را بررسی
می‌کند. مسیر compare از نظر داده قیمت stateless است، ولی session و سازمان معتبر
می‌خواهد. مسیرهای import و approval پس از persistence لیست قیمت جدا طراحی می‌شوند.

## مدیریت خطا

خطاهای دامنه enum پایدار دارند و تمام خطاهای HTTP دارای code انگلیسی، message
فارسی، details امن و request_id هستند. جزئیات داخلی، stack trace و محتوای فایل به
کاربر داده نمی‌شود. برای جلوگیری از ورود parameterهای SQL و hashها به log، خطای
غیرمنتظره فقط با نوع exception، مسیر و request id ثبت می‌شود و متن/stack خام آن
log نمی‌شود.

## مشاهده‌پذیری

در همه محیط‌ها log ساختاریافته JSON به stdout نوشته می‌شود. log درخواست شامل request id، روش، مسیر، وضعیت و زمان پاسخ است و محتوای فایل یا قیمت‌ها را ثبت نمی‌کند.

پیش از پایلوت عمومی:

- Sentry یا GlitchTip
- OpenTelemetry
- متریک زمان استخراج، تعداد ردیف، نرخ خطا و حجم فایل
- audit log برای اصلاح و تأیید

## مقیاس‌پذیری فعلی و آینده

Sessionهای اصلی در PostgreSQL هستند و API می‌تواند با store مشترک افقی اجرا شود؛
اما login rate limiter فعلی حافظه‌ای و تک‌پردازه است و در scale افقی شمارنده مشترک
ندارد. پیش از انتشار عمومی، limiter سطح reverse proxy یا adapter توزیع‌شده لازم
است. threadpool نیز ظرفیت نامحدود ندارد؛ timeout و انتقال پردازش طولانی به worker
پیش از بار عمومی لازم است.

پس از فعال‌شدن مرحله persistence:

- API افقی scale می‌شود.
- PostgreSQL منبع حقیقت است.
- فایل‌ها در object storage هستند.
- پردازش سنگین به worker منتقل می‌شود.
- استخراج هر سند idempotent است.

میکروسرویس فقط با یک فشار واقعی مانند نیاز مقیاس، مالکیت تیمی یا boundary عملیاتی مستقل توجیه می‌شود.
