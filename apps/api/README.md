# بک‌اند قیمت‌یار

این سرویس FastAPI در برش فعلی stateless است: دو فایل XLSX را اعتبارسنجی، استخراج و مقایسه می‌کند. PostgreSQL، Redis، object storage، احراز هویت و worker هنوز جزو runtime بک‌اند نیستند.

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

از ریشه مخزن:

    make api-dev

یا از این پوشه:

    uv sync
    uv run uvicorn app.main:app --reload

## کنترل کیفیت

    uv run ruff format --check app tests
    uv run ruff check app tests
    uv run mypy app
    uv run pytest

متغیرهای محیطی قابل استفاده در `.env.example` ثبت شده‌اند. محدودیت‌های workbook و archive باید متناسب با حافظه و CPU محیط استقرار تنظیم شوند؛ افزایش آن‌ها بدون آزمون بار توصیه نمی‌شود.
