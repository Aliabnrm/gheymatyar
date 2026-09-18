# ADR 0007: Import Draft پایدار و فایل اصلی مبتنی بر S3

- Status: Accepted
- Date: 2026-09-03

## Context

مقایسه stateless دو فایل برای اثبات extractor مفید است، اما منبع هر قیمت، تاریخچه
بارگذاری و نتیجه بازبینی را نگه نمی‌دارد. پس از ایجاد Supplier سازمان‌محور، هر فایل
قیمت باید بدون شکستن tenant isolation به تأمین‌کننده مشخص متصل و برای ممیزی حفظ شود.
PostgreSQL و object storage نیز transaction مشترک ندارند و پردازش XLSX فعلاً نیاز
اثبات‌شده‌ای به queue توزیع‌شده ندارد.

## Decision

- SourceDocument، ImportRun و ExtractedRow داخل bounded context `price_lists`
  قرار می‌گیرند؛ فایل generic domain مستقل نیست.
- فایل اصلی در bucket خصوصی سازگار با S3 و metadata، وضعیت Import و ردیف‌ها در
  PostgreSQL نگهداری می‌شوند. MinIO adapter توسعه و CI است.
- object key از Organization، Supplier و UUID تولیدشده سرور ساخته می‌شود و filename
  خام کاربر در آن قرار نمی‌گیرد. endpoint دانلود یا URL عمومی نداریم.
- SHA-256 کامل فایل محاسبه و ترکیب
  `(organization_id, supplier_id, sha256_hex)` یکتا می‌شود. constraint دیتابیس
  مرجع نهایی race است؛ فایل مشابه در Supplier یا Organization دیگر مجاز است.
- وضعیت‌ها در این Sprint فقط `DRAFT` و `FAILED` هستند. DRAFT حداقل یک ردیف کامل و
  بدون blocking error دارد؛ FAILED صفر ردیف و یک خطای مسدودکننده امن دارد.
- فایل‌های ناقض safety/container و resource limit ذخیره نمی‌شوند. فایل پذیرفته‌شده
  با خطای کیفیت داده حفظ و به FAILED تبدیل می‌شود تا علت شکست قابل پیگیری باشد.
- SourceDocument، ImportRun و تمام ExtractedRowهای DRAFT در یک transaction کوتاه
  و به‌صورت all-or-nothing درج می‌شوند. extraction و upload خارج transaction هستند.
- OWNER و OPERATOR می‌توانند برای Supplier فعال Draft بسازند و history/detail/rows
  را بخوانند. approval وجود ندارد؛ Importهای Supplier غیرفعال فقط خواندنی‌اند.
- پردازش synchronous و اجرای blocking extractor/S3 خارج از event loop است. Redis،
  Celery، progress ساختگی و retry job در این مرحله اضافه نمی‌شوند.
- اگر persistence پس از upload شکست بخورد، object همان request با compensating
  delete پاک می‌شود. نبود transaction مشترک S3/PostgreSQL و خطر محدود orphan object
  پذیرفته و برای عملیات آینده ثبت می‌شود.
- compare فعلی مستقل و stateless باقی می‌ماند و خودکار به Import یا approval متصل نمی‌شود.

## Consequences

- کاربر پس از refresh نیز فایل، وضعیت و ردیف‌های استخراج‌شده را در scope Supplier
  می‌بیند و منبع داده قابل ممیزی است.
- queryهای سازمانی و composite foreign keyها مانع اتصال سند، Import یا ردیف به tenant
  یا Supplier ناسازگار می‌شوند.
- unique hash و unique product code در Import، duplicateهای concurrent و identity
  مبهم را در مرز نهایی دیتابیس رد می‌کنند.
- نگهداری فایل و ردیف هزینه storage دارد و نیازمند retention، backup و پاک‌سازی
  orphan در آینده است.
- پردازش synchronous برای pilot ساده و قابل مشاهده است، اما latency و ظرفیت
  threadpool پیش از فایل‌های بزرگ یا scale افقی باید با worker و timeout حل شود.
- DRAFT داده معتبرشده برای بازبینی است، نه قیمت جاری؛ PriceListVersion و Approval
  همچنان تصمیم و قابلیت جداگانه‌اند.

## Rejected alternatives

- **ذخیره فایل به‌صورت blob در PostgreSQL:** backup و رشد دیتابیس را سنگین و مرز
  metadata/content را مبهم می‌کند.
- **filesystem محلی backend:** در چند instance مشترک و durable نیست.
- **bucket عمومی، presigned URL یا endpoint دانلود:** در این Sprint نیاز محصولی ندارد
  و سطح افشای فایل حساس را افزایش می‌دهد.
- **object key مبتنی بر filename:** داده untrusted، collision و نشت نام ایجاد می‌کند.
- **unique سراسری SHA-256:** استفاده مشروع فایل مشابه برای دو Supplier یا Organization
  را به‌اشتباه رد می‌کند.
- **ذخیره partial rows در FAILED:** مجموعه ناقص را با Draft قابل بازبینی اشتباه می‌کند.
- **Redis/Celery از ابتدا:** پیش از نیاز واقعی، dependency عملیاتی و state machine
  اضافی تحمیل می‌کند.
- **اتصال خودکار upload به compare یا approval:** مرز بازبینی انسانی و invariant
  نسخه‌های immutable را دور می‌زند.
