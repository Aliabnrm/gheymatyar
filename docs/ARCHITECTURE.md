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
       |   |-- comparison and import presentation
       |   |-- comparison and import use cases/ports
       |   |-- canonical rows and import domain
       |   +-- XLSX, PostgreSQL and S3 adapters
       |-- suppliers module
       |   |-- tenant-scoped CRUD use cases
       |   +-- SQLAlchemy repository
       |-- SQLAlchemy AsyncSession / asyncpg --> PostgreSQL 17+
       +-- shared S3 client -----------------> private S3 bucket (MinIO locally)

PostgreSQL منبع persistence حساب‌ها، نشست‌ها، تأمین‌کنندگان، Importها و ردیف‌های
استخراج‌شده است. فایل اصلی Import در object storage خصوصی نگهداری می‌شود. مقایسه
دو XLSX همچنان درخواست‌محور، stateless و مستقل از این جریان است؛ Import Draft نیز
هنوز PriceListVersion یا نسخه approved نمی‌سازد.

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
- SourceDocument، ImportRun با وضعیت‌های DRAFT/FAILED و ExtractedRow
- use caseهای upload، تاریخچه، detail و pagination ردیف‌ها
- portهای صریح repository، document storage و extractor async
- adapterهای SQLAlchemy، S3 و اجرای openpyxl خارج از event loop

Import متعلق به bounded context `price_lists` است و به ماژول generic فایل تبدیل
نشده است. دریافت multipart در presentation می‌ماند، orchestration در application
انجام می‌شود و domain هیچ وابستگی به FastAPI، SQLAlchemy، boto3 یا openpyxl ندارد.

### suppliers

- مدل و normalization مستقل نام تأمین‌کننده
- use caseهای create، list، detail و update
- repository با organization scope اجباری در همه امضاها و queryها
- soft deactivation و uniqueness نام canonical در هر سازمان
- routeهای خواندنی OWNER/OPERATOR و mutationهای OWNER با CSRF

quotations، PriceListVersion و approval هنوز کد یا جدول ندارند؛ mapping correction در Sprint 3 اضافه شده است.

## راه‌اندازی برنامه و مرزهای مشترک

`create_app(settings)` یک engine، `async_sessionmaker` و S3 client برای عمر برنامه
می‌سازد و آن‌ها را همراه تنظیمات و سرویس‌ها در composition root قرار می‌دهد.
برای هر عملیات repository یک AsyncSession کوتاه و transaction صریح باز می‌شود؛
engine یا pool در هر درخواست دوباره ساخته نمی‌شود. `pool_pre_ping` و timeout
قابل تنظیم‌اند و در تست از `NullPool` برای جداسازی event loopها استفاده می‌شود.
lifespan در shutdown engine و resource ذخیره‌سازی را می‌بندد. migration خودکار یا
ساخت bucket در startup وجود ندارد؛ Alembic و bucket provisioning پیش از استقرار
اجرا می‌شوند.

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

## جریان Import پایدار

1. Web فایل یک Supplier فعال را با Session Cookie و CSRF header ارسال می‌کند.
2. CurrentAccountContext، نقش OWNER/OPERATOR و عضویت همان سازمان را اعتبارسنجی می‌کند.
3. فایل bounded خوانده، filename برای نمایش امن و SHA-256 محاسبه می‌شود.
4. کنترل archive و extraction قطعی openpyxl خارج از event loop انجام می‌شود؛ در
   این مدت transaction دیتابیس باز نیست.
5. object key فقط از UUIDهای server-generated ساخته و فایل در bucket خصوصی ذخیره می‌شود.
6. transaction کوتاه PostgreSQL، SourceDocument و ImportRun را همراه batch کامل
   ExtractedRowها برای DRAFT درج می‌کند. FAILED هیچ ردیفی ندارد.
7. در شکست persistence یا race، object همان درخواست با compensating delete پاک
   می‌شود؛ PostgreSQL و S3 transaction مشترک ندارند.
8. history، detail و rows همیشه در SQL با organization و supplier جاری محدود می‌شوند.

## مسیر persistence

جدول‌های موجود:

- organizations
- users
- organization_memberships
- sessions
- suppliers
- source_documents
- import_runs
- extracted_rows

جدول‌های زیرمرحله‌های بعد:

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
- GET/POST /api/v1/suppliers
- GET/PATCH /api/v1/suppliers/{supplier_id}
- POST/GET /api/v1/suppliers/{supplier_id}/imports
- GET /api/v1/suppliers/{supplier_id}/imports/{import_id}
- GET /api/v1/suppliers/{supplier_id}/imports/{import_id}/rows
- POST /api/v1/price-lists/compare

`live` عمومی و مستقل از dependencyها است؛ `ready` با `SELECT 1` PostgreSQL و request
سبک دسترسی bucket را بررسی می‌کند. مسیر compare از نظر داده قیمت stateless است،
ولی session و سازمان معتبر می‌خواهد. مسیر Import پایدار جداست و approval ندارد.

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

در persistence فعلی PostgreSQL منبع حقیقت metadata و object storage منبع فایل اصلی
است. SHA-256 در scope سازمان و تأمین‌کننده idempotency اولیه را فراهم می‌کند.
پردازش هنوز synchronous و محدود به threadpool است؛ پیش از بار عمومی، timeout سخت،
اسکن بدافزار و انتقال پردازش سنگین به worker لازم است. همچنین نبود transaction
مشترک S3/PostgreSQL به معنای خطر محدود orphan object در failureهای خاص است.

میکروسرویس فقط با یک فشار واقعی مانند نیاز مقیاس، مالکیت تیمی یا boundary عملیاتی مستقل توجیه می‌شود.

## نگاشت و اجرای مجدد (ADR 0008)

Sprint 3 به همان ماژول price_lists اضافه شده است: مدل CanonicalField و
ColumnMapping در domain، orchestration بازبینی/اجرای مجدد/ذخیره الگو و portها در
application، adapterهای XLSX، خواندن bounded از S3 و repository در infrastructure،
و schema/route در presentation. SQLAlchemy هیچ وابستگی‌ای به schemaهای HTTP ندارد.

migration 0008 دو ستون nullable به ImportRun و جدول supplier_mapping_templates
اضافه می‌کند؛ داده موجود backfill یا بازنویسی نمی‌شود. FK ترکیبی parent، سازمان،
تأمین‌کننده و همان SourceDocument را الزام می‌کند. template با FK سازمانی به
Supplier و Import مرجع متصل است. unique index جزئی و قفل Supplier فقط یک Template
فعال را تضمین می‌کنند. actor و timestamp اجرای اصلاحی و نسخه‌های الگو audit این برش‌اند.

اجرای مجدد فایل را از key خصوصی ثبت‌شده می‌خواند، اندازه و hash را کنترل می‌کند،
خارج transaction استخراج می‌کند و run/تمام ردیف‌ها را در یک transaction کوتاه
درج می‌کند. در شکست هیچ ردیف جزئی و هیچ object تازه‌ای باقی نمی‌ماند.
