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

کاربر ابتدا با Cookie session امن وارد سازمان خود می‌شود. OWNER تأمین‌کنندگان
سازمان را مدیریت می‌کند و OWNER یا OPERATOR می‌تواند برای یک تأمین‌کننده فعال،
فایل XLSX قیمت بارگذاری کند. فایل اصلی در object storage خصوصی، مشخصات import و
ردیف‌های استاندارد در PostgreSQL نگهداری می‌شوند و نتیجه به‌صورت `DRAFT` آماده
بازبینی یا با وضعیت `FAILED` و خطای مسدودکننده ثبت می‌شود. کاربر می‌تواند Draft
معتبر را با آخرین نسخه ثبت‌شده همان تأمین‌کننده مقایسه و پس از بازبینی، با اقدام
صریح به snapshot تغییرناپذیر تبدیل کند. تاریخچه، ردیف‌ها و تغییرات هر نسخه پس از
refresh باقی می‌مانند.

داشبورد مقایسه دو فایل همچنان یک جریان مستقل و stateless است: دو فایل را در همان
درخواست استخراج و مقایسه می‌کند و نتیجه شامل کالاهای اضافه، حذف، افزایش/کاهش قیمت
و تغییرات پرخطر بسته‌بندی را برمی‌گرداند. Import پایدار خودکار قیمت جاری ایجاد
نمی‌کند؛ Version فقط پس از تصمیم صریح OWNER تأیید و به قیمت جاری تبدیل می‌شود.

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
- PostgreSQL 17 و یک object storage سازگار با S3، یا Docker

راه‌اندازی:

    make bootstrap

PostgreSQL، MinIO، bucket خصوصی و migration برای اجرای host:

    docker compose up -d postgres minio minio-init
    cp .env.example .env
    make backend-migrate

اجرای بک‌اند:

    make backend-dev

اجرای فرانت‌اند در یک ترمینال دیگر:

    make frontend-dev

سپس صفحه ثبت‌نام در http://localhost:3000/register، ورود در
http://localhost:3000/login و مستندات API در http://localhost:8000/docs در دسترس
است. ثبت‌نام عمومی در development فعال و در production به‌صورت پیش‌فرض خاموش است.
مدیریت تأمین‌کنندگان پس از ورود در http://localhost:3000/suppliers در دسترس است.
تاریخچه فایل‌های قیمت در جزئیات هر تأمین‌کننده و فرم بارگذاری در مسیر
`/suppliers/{supplierId}/imports/new` در دسترس است.

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

`make compose-up` ابتدا PostgreSQL، MinIO و bucket خصوصی را آماده و Alembic را
به‌عنوان فرمان استقرار جدا اجرا می‌کند؛ خود برنامه در startup migration یا ساخت
bucket انجام نمی‌دهد. Redis در Compose برای مراحل آینده باقی مانده، اما backend
این slice به آن وابسته نیست. endpoint دانلود یا URL عمومی برای فایل اصلی وجود ندارد.

## نقشه اسناد

- docs/PRODUCT.md: مسئله، کاربر و معیار موفقیت
- docs/ARCHITECTURE.md: مرزهای سیستم و جریان داده
- docs/DOMAIN.md: قواعد دامنه و قرارداد مقایسه
- docs/API.md: قرارداد HTTP و خطاها
- docs/SECURITY.md: مدل تهدید و کنترل‌ها
- docs/TESTING.md: راهبرد تست
- docs/ROADMAP.md: مراحل توسعه محصول
- docs/SPRINT_PLAN_FA.md: برنامه اسپرینت‌های محصول، فیچرها و مسیر یادگیری
- docs/adr: تصمیم‌های معماری
- docs/codex/MASTER_IMPLEMENTATION_PROMPT_FA.md: پرامپت جامع قابل استفاده در Codex
- AGENTS.md: دستور دائمی و اجرایی Codex برای این مخزن

## نگاشت قالب تأمین‌کننده (Sprint 3)

در جزئیات Import، بخش «نگاشت ستون‌ها» عنوان، ستون‌ها و پیش‌نمایش محدود فایل را
نشان می‌دهد. برگه یا ردیف عنوان را انتخاب، پیش‌نمایش را تازه و ستون‌های کد، نام و
قیمت ریالی را تعیین کنید. «اجرای جدید با این نگاشت» نتیجه تازه می‌سازد و تاریخچه
قبلی حفظ می‌شود. در اجرای موفق می‌توانید الگو را برای همان تأمین‌کننده ذخیره کنید.
جایگزینی الگوی فعال نیازمند checkbox تأیید است و عملیات استخراج را اجرا نمی‌کند.

پس از دریافت تغییرات، `make backend-migrate` لازم است. قرارداد کامل در
[docs/API.md](docs/API.md) و تصمیم immutability در ADR 0008 آمده است.

## نسخه‌های تغییرناپذیر قیمت (Sprint 4)

در جزئیات Import معتبر، بخش «مقایسه با آخرین نسخه ثبت‌شده» خلاصه و جدول تغییرات
چندبرچسبی را نشان می‌دهد. ساخت نسخه نیازمند checkbox تأیید است و نتیجه به‌صورت
اتمیک در `price_list_versions` و `price_list_items` ثبت می‌شود. تاریخچه نسخه‌ها در
صفحه تأمین‌کننده و جزئیات مستقل هر نسخه در مسیر
`/suppliers/{supplierId}/price-list-versions/{versionId}` در دسترس است.

نسخه ثبت‌شده فقط snapshot ممیزی‌پذیر است و خودکار تأیید نمی‌شود. تصمیم معنایی کامل
Version در ADR 0009 ثبت شده است.

## Approval و قیمت جاری (Sprint 5)

نسخه تازه با وضعیت «آماده بررسی» ساخته می‌شود. فقط OWNER می‌تواند آخرین نسخه
Supplier را پس از confirmation صریح تأیید یا با دلیل رد کند. Approval در یک
transaction نسخه را تأیید، آن را قیمت جاری Supplier و رویداد ممیزی را ثبت می‌کند؛
Reject قیمت جاری قبلی را تغییر نمی‌دهد. OPERATOR وضعیت و Audit را فقط‌خواندنی می‌بیند.

صفحه Supplier کارت قیمت جاری و تاریخچه وضعیت‌ها را دارد و صفحه Version پنل تصمیم،
actor/time/note و Audit Timeline را نمایش می‌دهد. برای schemaهای Sprint 5 ابتدا
`make backend-migrate` را اجرا کنید. جزئیات در ADR 0010 و
`docs/SPRINT5_REPORT_FA.md` آمده است.
