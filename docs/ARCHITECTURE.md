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
       |-- price_lists module
       |   |-- presentation
       |   |-- application
       |   |-- domain
       |   +-- XLSX infrastructure
       +-- no persistence in the current slice

در برش اول، مقایسه بدون ذخیره دائمی انجام می‌شود تا منطق دامنه مستقل و تست‌پذیر تثبیت شود.

## قانون وابستگی

    presentation -> application -> domain
    infrastructure -> application/domain ports

Domain نباید FastAPI، SQLAlchemy، openpyxl، Redis، S3 یا SDK مدل AI را import کند.

## ماژول پیاده‌سازی‌شده بک‌اند

### price_lists

- مدل استاندارد ردیف
- نرمال‌سازی
- اعتبارسنجی
- الگوریتم مقایسه
- انواع تغییر

دریافت امن فایل جزئی از مرز presentation همین قابلیت است؛ تا زمانی که چرخه import مستقل و persistence نداریم، ماژول جداگانه‌ای برای imports ساخته نمی‌شود. suppliers، organizations و quotations فقط مفاهیم roadmap هستند و هنوز کد یا جدول ندارند.

## راه‌اندازی برنامه و مرزهای مشترک

`create_app(settings)` برنامه FastAPI را می‌سازد و تنظیمات تایپ‌شده را در state برنامه قرار می‌دهد. این factory باعث می‌شود تست‌ها بدون دست‌کاری global configuration برنامه مستقل بسازند.

لایه مشترک HTTP مسئول موارد زیر است:

- router ریشه و نسخه v1
- health response صریح
- CORS محدود به originهای معتبر
- request ID و headerهای امنیتی
- log ساختاریافته JSON
- تبدیل مرکزی خطاها به قرارداد پایدار

## جریان مقایسه فعلی

1. Web دو فایل multipart ارسال می‌کند.
2. API اندازه، پسوند و امضای ZIP را کنترل می‌کند.
3. API پردازش هم‌گام openpyxl را به threadpool محدود Starlette می‌سپارد تا event loop مسدود نشود.
4. XlsxPriceListExtractor سطر عنوان را پیدا می‌کند.
5. ردیف‌ها به PriceListItem تبدیل می‌شوند و invariantهای دامنه کنترل می‌شوند.
6. قوانین قطعی خطا را تولید می‌کنند.
7. ComparePriceLists بر اساس کد نرمال‌شده دو map می‌سازد.
8. خروجی چندبرچسبی و summary تولید می‌شود.
9. API پاسخ نسخه‌دار برمی‌گرداند و هر دو فایل موقت درخواست را می‌بندد.

## مسیر persistence

جدول‌های اصلی مرحله بعد:

- organizations
- users
- memberships
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
- POST /api/v1/price-lists/compare

مسیر compare در مرحله اول stateless است. مسیرهای import و approval پس از اضافه‌شدن persistence جدا طراحی می‌شوند.

## مدیریت خطا

خطاهای دامنه enum پایدار دارند و تمام خطاهای HTTP دارای code انگلیسی، message فارسی، details امن و request_id هستند. جزئیات داخلی، stack trace و محتوای فایل به کاربر داده نمی‌شود؛ stack trace خطای غیرمنتظره فقط در log داخلی ثبت می‌شود.

## مشاهده‌پذیری

در همه محیط‌ها log ساختاریافته JSON به stdout نوشته می‌شود. log درخواست شامل request id، روش، مسیر، وضعیت و زمان پاسخ است و محتوای فایل یا قیمت‌ها را ثبت نمی‌کند.

پیش از پایلوت عمومی:

- Sentry یا GlitchTip
- OpenTelemetry
- متریک زمان استخراج، تعداد ردیف، نرخ خطا و حجم فایل
- audit log برای اصلاح و تأیید

## مقیاس‌پذیری فعلی و آینده

API فعلی stateless است و می‌تواند افقی اجرا شود. threadpool از توقف درخواست‌های سبک هنگام parse فایل جلوگیری می‌کند، اما ظرفیت آن نامحدود نیست؛ timeout، محدودیت حافظه سطح process و انتقال پردازش طولانی به worker پیش از بار عمومی لازم است.

پس از فعال‌شدن مرحله persistence:

- API افقی scale می‌شود.
- PostgreSQL منبع حقیقت است.
- فایل‌ها در object storage هستند.
- پردازش سنگین به worker منتقل می‌شود.
- استخراج هر سند idempotent است.

میکروسرویس فقط با یک فشار واقعی مانند نیاز مقیاس، مالکیت تیمی یا boundary عملیاتی مستقل توجیه می‌شود.
