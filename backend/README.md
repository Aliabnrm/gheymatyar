# بک‌اند قیمت‌یار

این سرویس FastAPI حساب و نشست سازمانی را در PostgreSQL نگهداری می‌کند و برای کاربر
احراز هویت‌شده دو فایل XLSX را اعتبارسنجی، استخراج و مقایسه می‌کند. فایل و نتیجه
مقایسه هنوز persist نمی‌شوند. Redis، object storage و worker جزو runtime این برش
نیستند.

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
    └── modules/price_lists/
        ├── presentation/       # multipart، schema، DI و threadpool boundary
        ├── application/        # use case مقایسه و extractor port
        ├── domain/             # مدل، invariant، normalization و diff
        └── infrastructure/     # پیاده‌سازی امن openpyxl

قانون وابستگی:

    presentation -> application -> domain
    infrastructure -> application/domain

domain هیچ وابستگی‌ای به FastAPI، Pydantic، openpyxl یا زیرساخت خارجی ندارد. dependency injection مخصوص framework در presentation باقی می‌ماند.

## اجرا

PostgreSQL را بالا بیاورید و migration را جداگانه اجرا کنید:

    docker compose up -d postgres
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
برنامه migration را در startup اجرا نمی‌کند.

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
