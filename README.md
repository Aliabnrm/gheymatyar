# قیمت‌یار

قیمت‌یار یک وب‌اپ B2B برای عمده‌فروش‌های تجهیزات شبکه و دوربین مداربسته است. اولین برش محصول، دو نسخه فایل قیمت Excel یک تأمین‌کننده را می‌خواند و تغییرات کد، نام، واحد، تعداد بسته، موجودی و قیمت ریالی را نمایش می‌دهد.

## تصمیم‌های فعلی

- تجربه اصلی: وب‌اپ SaaS با داشبورد Desktop-first و رابط فارسی RTL
- بازار شروع: عمده‌فروش‌های شبکه و دوربین مداربسته تهران
- پول مرجع: ریال ایران به‌صورت عدد صحیح
- معماری: Modular Monolith
- بک‌اند: FastAPI، SQLAlchemy async و PostgreSQL
- فرانت‌اند: Next.js و TypeScript
- ورودی MVP: فقط XLSX
- AI: در جریان Excel استفاده نمی‌شود

## برش قابل اجرای فعلی

کاربر ابتدا با Cookie session امن وارد سازمان خود می‌شود و سپس دو فایل XLSX را
در داشبورد انتخاب می‌کند. بک‌اند فایل‌ها را به ساختار استاندارد تبدیل می‌کند و
نتیجه مقایسه شامل کالاهای اضافه، حذف، افزایش/کاهش قیمت و تغییرات پرخطر بسته‌بندی
را برمی‌گرداند. فایل و نتیجه هنوز persist نمی‌شوند.

فایل‌های fixtures/excel داده آزمایشی هستند و قیمت واقعی بازار محسوب نمی‌شوند.

## ساختار مخزن

    backend/        # سرویس FastAPI، دامنه، استخراج XLSX و تست‌های بک‌اند
    frontend/       # داشبورد Next.js، قابلیت‌ها و تست‌های فرانت‌اند
    contracts/      # قراردادهای داده مشترک
    docs/           # اسناد محصول، معماری، امنیت و ADRها
    fixtures/       # داده ساختگی مشترک برای regression و آزمون سراسری
    infra/          # مستندات و تنظیمات زیرساخت مشترک

فایل‌های orchestration مانند Makefile، Docker Compose، workspace و تنظیمات CI در root قرار دارند.

## اجرای سریع

پیش‌نیازها:

- Python 3.12 یا جدیدتر
- uv
- Node.js 20 یا جدیدتر
- pnpm 9 یا جدیدتر
- PostgreSQL 17 یا Docker

راه‌اندازی:

    make bootstrap

PostgreSQL و migration برای اجرای host:

    docker compose up -d postgres
    cp .env.example .env
    make backend-migrate

اجرای بک‌اند:

    make backend-dev

اجرای فرانت‌اند در یک ترمینال دیگر:

    make frontend-dev

سپس صفحه ثبت‌نام در http://localhost:3000/register، ورود در
http://localhost:3000/login و مستندات API در http://localhost:8000/docs در دسترس
است. ثبت‌نام عمومی در development فعال و در production به‌صورت پیش‌فرض خاموش است.

برای ساخت OWNER اولیه production از prompt بدون echo استفاده کنید:

    cd backend
    uv run gheymatyar-create-owner \
      --email owner@example.com \
      --organization-name "شرکت نمونه"

## کنترل کیفیت

    make test
    make lint

## اجرای Container

    cp .env.example .env
    make compose-up

`make compose-up` ابتدا PostgreSQL را آماده و Alembic را به‌عنوان فرمان استقرار
جدا اجرا می‌کند؛ خود برنامه در startup migration اجرا نمی‌کند. Redis و MinIO در
Compose برای مراحل آینده باقی مانده‌اند، اما backend این slice به آن‌ها وابسته نیست.

## نقشه اسناد

- docs/PRODUCT.md: مسئله، کاربر و معیار موفقیت
- docs/ARCHITECTURE.md: مرزهای سیستم و جریان داده
- docs/DOMAIN.md: قواعد دامنه و قرارداد مقایسه
- docs/API.md: قرارداد HTTP و خطاها
- docs/SECURITY.md: مدل تهدید و کنترل‌ها
- docs/TESTING.md: راهبرد تست
- docs/ROADMAP.md: مراحل توسعه محصول
- docs/adr: تصمیم‌های معماری
- docs/codex/MASTER_IMPLEMENTATION_PROMPT_FA.md: پرامپت جامع قابل استفاده در Codex
- AGENTS.md: دستور دائمی و اجرایی Codex برای این مخزن
