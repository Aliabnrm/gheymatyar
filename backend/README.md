# بک‌اند قیمت‌یار

این سرویس FastAPI حساب، نشست سازمانی، تأمین‌کننده و Importهای فایل قیمت را در
PostgreSQL نگهداری می‌کند. فایل اصلی هر Import در Object Storage سازگار با S3
(در توسعه محلی MinIO) نگهداری و ردیف‌های canonical آن به‌صورت atomic ذخیره
می‌شوند. endpoint مقایسه مستقیم دو فایل همچنان stateless است. Redis و worker
جزو runtime این برش نیستند.

## ساختار

    app/
    ├── main.py                 # create_app و ترکیب برنامه
    ├── api/
    │   ├── dependencies.py     # dependencyهای مشترک HTTP
    │   ├── errors.py           # ترجمه مرکزی خطاها
    │   ├── health.py           # health endpoints
    │   ├── router.py           # root و /api/v1
    │   └── schemas.py          # قراردادهای مشترک transport
    ├── core/
    │   ├── config.py           # تنظیمات تایپ‌شده
    │   ├── logging.py          # log ساختاریافته JSON
    │   └── middleware.py       # request ID و security headers
    ├── infrastructure/database/ # engine، AsyncSession و readiness
    ├── modules/accounts/        # Auth، Organization و Session
    │   ├── presentation/        # route، Cookie، CSRF، DI و schema
    │   ├── application/         # use case، DTO و portهای حساب
    │   ├── domain/              # role، context و خطاهای مستقل
    │   └── infrastructure/      # SQLAlchemy، Argon2id و token امن
    ├── modules/price_lists/
    │   ├── presentation/       # multipart، قرارداد Import و threadpool boundary
    │   ├── application/        # compare/import use case و portهای DB/storage
    │   ├── domain/             # مدل، وضعیت DRAFT/FAILED، normalization و diff
    │   └── infrastructure/     # openpyxl، SQLAlchemy و S3 adapter
    └── modules/suppliers/      # CRUD سازمانی، normalization و soft deactivation

قانون وابستگی:

    presentation -> application -> domain
    infrastructure -> application/domain

domain هیچ وابستگی‌ای به FastAPI، Pydantic، openpyxl یا زیرساخت خارجی ندارد. dependency injection مخصوص framework در presentation باقی می‌ماند.

## اجرا

PostgreSQL و MinIO را بالا بیاورید و migration را جداگانه اجرا کنید:

    docker compose up -d postgres minio minio-init
    cp .env.example .env
    cd backend
    uv sync --dev
    uv run alembic upgrade head
    uv run alembic check

از ریشه مخزن:

    make backend-dev

یا از این پوشه:

    uv sync
    uv run uvicorn app.main:app --reload

Backend روی host از `DATABASE_URL` با hostname `localhost` در `.env.example`
استفاده می‌کند. Compose همان variable را با hostname `postgres` override می‌کند.
برای MinIO نیز اجرای host از `S3_ENDPOINT_URL=http://localhost:9000` و اجرای
Compose از hostname `minio` استفاده می‌کند. bucket خصوصی باید پیش از startup با
init service ساخته شود. برنامه migration یا ساخت bucket را در startup اجرا
نمی‌کند.

## Auth و onboarding

endpointهای `/api/v1/auth/register|login|logout|me` از Session opaque و Cookie
استفاده می‌کنند. `gheymatyar_session` HttpOnly است و token خام در response یا
JavaScript قرار نمی‌گیرد. mutationهای دارای Session به `gheymatyar_csrf` و header
`X-CSRF-Token` نیاز دارند. نقش‌ها فقط OWNER و OPERATOR هستند.

در production ثبت‌نام عمومی پیش‌فرض خاموش است. OWNER اولیه را با password بدون
echo بسازید:

    uv run gheymatyar-create-owner \
      --email owner@example.com \
      --organization-name "شرکت نمونه"

CLI از Register use case اصلی استفاده و نشست موقت بدون Cookie را فوراً revoke می‌کند.

## کنترل کیفیت

    uv run ruff format --check app tests
    uv run ruff check app tests
    uv run mypy app
    uv run pytest

متغیرهای محیطی قابل استفاده در `.env.example` ثبت شده‌اند. محدودیت‌های workbook و archive باید متناسب با حافظه و CPU محیط استقرار تنظیم شوند؛ افزایش آن‌ها بدون آزمون بار توصیه نمی‌شود.

تست‌های persistence روی PostgreSQL واقعی اجرا می‌شوند؛ SQLite پشتیبانی نمی‌شود.
CI PostgreSQL 17 را آماده و migration را پیش از pytest اجرا می‌کند.

## Supplier

routeهای `GET/POST /api/v1/suppliers` و
`GET/PATCH /api/v1/suppliers/{supplier_id}` با organization جاری محدود می‌شوند.
OWNER مجاز به write و OPERATOR مجاز به read است. POST/PATCH به CSRF نیاز دارند و
حذف فیزیکی Supplier وجود ندارد.

## Import فایل قیمت

مسیرهای زیر برای OWNER و OPERATOR فعال‌اند:

    POST /api/v1/suppliers/{supplier_id}/imports
    GET  /api/v1/suppliers/{supplier_id}/imports
    GET  /api/v1/suppliers/{supplier_id}/imports/{import_id}
    GET  /api/v1/suppliers/{supplier_id}/imports/{import_id}/rows

POST به Cookie session و `X-CSRF-Token` نیاز دارد. فایل safety-invalid ذخیره
نمی‌شود؛ خطای کیفیت داده یک Import با وضعیت `FAILED` و بدون ردیف جزئی می‌سازد.
فایل معتبر با وضعیت `DRAFT` و ردیف‌های استخراج‌شده ذخیره می‌شود. فایل تکراری
برای همان سازمان و تأمین‌کننده با SHA-256 شناسایی می‌شود. Approval، download و background processing وجود ندارند؛ mapping در Sprint 3 اضافه شده است.

Readiness هم PostgreSQL و هم دسترسی bucket را بررسی می‌کند؛ liveness مستقل از
هر دو dependency باقی می‌ماند.

## نگاشت Sprint 3

migration `20260906_0008` نگاشت snapshot، parent اجرای اصلاحی و Templateهای
سازمانی را اضافه می‌کند. APIهای `/imports/{id}/mapping`، `/imports/{id}/rerun`
و `/mapping-template` زیر Supplier قرار دارند. ذخیره Template فقط از DRAFT موفق
ممکن است؛ اجرای مجدد فایل خصوصی را با hash کنترل و run تازه می‌سازد.
