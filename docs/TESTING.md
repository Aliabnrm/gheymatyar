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
- normalization نام Supplier و update command
- invariantهای DRAFT/FAILED، SHA-256، object key و JSON-safe raw row
- دسته‌بندی خطای safety/data-quality و compensating delete

### Fixture regression

دو فایل fixtures/excel باید همیشه summary ثبت‌شده در fixtures/expected را تولید
کنند: ۲۴ ردیف قدیم، ۲۴ ردیف جدید، ۲ اضافه، ۲ حذف، ۱۸ تغییر قیمت، ۲ تغییر فقط
metadata و ۲ بدون تغییر؛ تغییر pack-size کد `ACC-RJ45-CAT6-100` نیز باید باقی
بماند. این تست مهم‌ترین قرارداد فعلی است.

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
- CRUD تأمین‌کننده، role matrix، CSRF و پاسخ‌های پایدار
- tenant escape با UUID تأمین‌کننده سازمان دیگر
- upload، history، detail و rows Import با role و CSRF صحیح
- duplicate hash، Supplier غیرفعال و storage unavailable
- DRAFT اتمیک و FAILED بدون ردیف جزئی
- readiness موفق/ناموفق PostgreSQL و bucket خصوصی

### PostgreSQL integration

تست persistence فقط روی PostgreSQL اجرا می‌شود و SQLite جایگزین آن نیست. پیش از
pytest، migration با `alembic upgrade head` اجرا می‌شود. تست‌ها constraintهای
unique، FK، role CHECK و timestamp timezone-aware را روی schema واقعی بررسی
می‌کنند. migration Import همچنین composite tenant FK، status consistency، قیمت،
pack size، شماره ردیف و uniqueness کد محصول/hash فایل را کنترل می‌کند. CI سرویس‌های
سالم PostgreSQL 17 و MinIO با bucket تست خصوصی دارد، migration را اجرا و سپس test
suite و storage integration را آغاز می‌کند. تست storage اجرا‌نشده موفق محسوب نمی‌شود.

### Object Storage integration

- object واقعی با key تولیدشده سرور و محتوای برابر فایل اصلی ذخیره می‌شود.
- filename خام وارد key نمی‌شود و bucket عمومی نیست.
- شکست storage پاسخ امن 503 می‌دهد و رکورد موفق نمی‌سازد.
- شکست دیتابیس یا duplicate race، object همان request را با compensating delete پاک می‌کند.
- تست‌ها objectهای ساخته‌شده خود را پاک می‌کنند.

### File security

- سقف ردیف، ستون و worksheet
- سقف مجموع حجم بازشده archive
- ردکردن صریح فایل عبورکرده از محدودیت
- پاک‌سازی filename traversal
- فایل empty/unreadable/encrypted و ZIP bomb
- بستن UploadFile در مسیر موفق و خطا
- عدم ذخیره فایل safety-invalid

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
- schema/API/query cache و فرم React Hook Form تأمین‌کننده
- loading، empty، read-only و mutation stateهای Supplier
- Zod/API/query-key و cache lifecycle برای Importهای هر Supplier
- فرم upload با React Hook Form Controller و FormData در service boundary
- history و detail در حالت DRAFT/FAILED و pagination ردیف‌ها
- duplicate، inactive، forbidden، not-found، network/server/storage error

### End-to-End

پس از پایدارشدن محیط:

1. ورود، انتخاب Supplier فعال و بارگذاری XLSX
2. کنترل history، وضعیت DRAFT و ردیف‌های persistشده پس از refresh
3. کنترل نمایش FAILED بدون ردیف جزئی برای فایل دارای خطای کیفیت داده
4. اجرای compare stateless با V1/V2 و کنترل summary و تغییر pack size

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

## تست‌های امنیتی

- tenant escape Import و rows با UUID سازمان/Supplier دیگر
- formula injection در export
- timeout OCR/Vision
- prompt injection در سند

tenant escape برای Supplier و Import با list/get/update/rows سازمان دیگر پوشش داده شده است.
session با organization یا membership نامعتبر و membership مبهم نیز در تست‌های
foundation باقی مانده است.

## بررسی Sprint 3 — 2026-09-06

تست‌های افزوده:

- `test_column_mapping.py`: alias فارسی/عربی/لاتین، ترتیب ستون، header غیر اول،
  نگاشت ناقص/تکراری/خارج محدوده، header و ستون مبهم، صفر ابتدایی، خطای ردیفی محدود،
  نگهداری ستون‌های هم‌عنوان، تومان، float و جداکننده مبهم، ماکرو با نام جعلی، XML خراب،
  مهلت پردازش و dimension جعلی که ستون قیمت دوم را پنهان می‌کند.
- `test_mapping_api.py`: correction، استفاده و جایگزینی Template، race ایجاد و
  جایگزینی، OWNER/OPERATOR و CSRF، tenant/Supplier isolation، Supplier غیرفعال،
  حفظ تاریخچه، کنترل SHA-256 و rollback واقعی پس از flush اجرای جدید.
- تست constraintهای FK ترکیبی parent روی همان SourceDocument و Template روی همان Supplier.
- تست schema/API/hooks فرانت‌اند برای preview bounded، canonical fields، CSRF،
  انتقال request و invalidation تاریخچه، جزئیات، ردیف‌ها و نگاشت با حفظ scope Supplier.
- تست component برای loading، empty، success، validation/server error، جلوگیری
  از انتخاب ناقص/تکراری، تأیید جایگزینی، Supplier غیرفعال و escaping متن Excel.

بررسی واقعی مرورگر با حساب و داده ساختگی محلی انجام شد: فایل با عنوان‌های سفارشی
ابتدا FAILED شد؛ ردیف دوم و سه ستون دستی انتخاب شدند؛ اجرای جدید DRAFT با
کد `001-A` و شماره ردیف ۳ نمایش داده شد؛ ذخیره Template موفق بود و جایگزینی تا
تأیید checkbox مسدود ماند. چیدمان فارسی RTL و جدول preview نیز بصری بررسی شد.

migration در دو دیتابیس موقت مستقل بررسی شد: upgrade از صفر به head و upgrade
از 0007 دارای SourceDocument/ImportRun تاریخی به 0008. snapshot همه ستون‌های
قدیمی پیش/پس از migration برابر بود و ستون‌های جدید null ماندند. هر دو
`alembic check` پاس شدند و دیتابیس‌های موقت پاک شدند. migration روی دیتابیس توسعه
نیز بدون تغییر داده تاریخی اعمال شده است.

فرمان تست کامل با storage واقعی:

    RUN_OBJECT_STORAGE_INTEGRATION=1 make test

MinIO محلی و bucket خصوصی پیش از اجرا آماده شدند. fixtureهای baseline و JSON
انتظار بدون تغییر باقی مانده‌اند. شمارش مرجع ۲۴/۲۴، ۲ اضافه، ۲ حذف، ۱۸ تغییر قیمت،
۲ تغییر صرفاً metadata، ۲ بدون تغییر و تغییر بسته `ACC-RJ45-CAT6-100` پاس می‌شود.

`make lint` (Ruff، mypy، ESLint، TypeScript و Prettier)، بررسی Ruff format،
`pnpm --dir frontend build` و `alembic check` نیز اجرا شده‌اند.

نتیجه نهایی این اجرا: **۱۴۴ تست بک‌اند و ۹۶ تست فرانت‌اند موفق، بدون skip**.
گزارش فایل‌ها و تصمیم‌ها در [SPRINT3_REPORT_FA.md](SPRINT3_REPORT_FA.md) است.

## پوشش Sprint 4 — 2026-09-18

تست‌های domain و application، lineage نسخه اول/بعدی، حفظ صفر ابتدایی کد، تبدیل
VersionItem برای comparison، تغییر هم‌زمان قیمت/واحد/بسته و summary مستقل از فیلتر
را پوشش می‌دهند. integration واقعی PostgreSQL شامل این موارد است:

- ساخت نسخه توسط OWNER/OPERATOR با Session و CSRF و رد confirmation ناقص
- اولین baseline، Version شماره ۱ و زنجیره Version شماره ۲
- duplicate Import، stale baseline، Supplier غیرفعال و Import نامعتبر
- tenant و Supplier isolation برای read/write
- constraintهای composite و OpenAPI مسیرهای جدید
- fixture مرجع ۲۴/۲۴، ۲ اضافه، ۲ حذف، ۱۸ تغییر قیمت، ۲ metadata-only، ۲ بدون تغییر
  و تغییر بسته `ACC-RJ45-CAT6-100`
- ثابت‌ماندن baseline گزارش Import نسخه‌شده و گزارش Version تاریخی

فرانت‌اند schemaهای معتبر/نامعتبر، path و query params، CSRF، AbortSignal، query
keyهای Supplier-scoped، invalidation هدفمند، conflict refresh و نبود retry mutation
را بررسی می‌کند. تست component حالت loading، no-baseline، success، server error،
Supplier غیرفعال، confirmation، conflict، history خالی، چند badge، zero-leading code،
مبلغ ریالی، escaping متن untrusted و table semantic را پوشش می‌دهد. architecture
test نیز fetch و organizationId را از feature و وابستگی UI را از service دور نگه می‌دارد.

نتیجه نهایی فرمان‌های کامل و migration verification در
[SPRINT4_REPORT_FA.md](SPRINT4_REPORT_FA.md) ثبت می‌شود.

## پوشش Sprint 5 — 2026-09-21

Backend transition آماده به تأیید/رد، terminal بودن تصمیم‌ها، دلیل اجباری، طول note،
actor/time، atomic بودن pointer و Audit، current خالی، جایگزینی current، باقی‌ماندن
Approved قبلی، latest-only، stale CAS، race دو Approval، نقش OWNER/OPERATOR، CSRF و
tenant isolation را پوشش می‌دهد. constraintها و GET-only بودن Audit نیز از schema
واقعی PostgreSQL و OpenAPI بررسی می‌شوند.

Frontend وضعیت‌های Review و Current، schemaهای تصمیم/Audit، path و body و CSRF،
AbortSignal readها، query keyهای scoped، نبود retry و optimistic update، invalidation
پس از success/conflict و componentهای Approval، rejection validation، Operator
read-only، current empty/error و Audit empty/error را تست می‌کند.

نتیجه نهایی suite کامل، lint/typecheck/build و migration verification در
[SPRINT5_REPORT_FA.md](SPRINT5_REPORT_FA.md) ثبت می‌شود.

## پوشش قابلیت اثر بر قیمت جاری — 2026-10-14

Backend unit، وضعیت `NO_CURRENT`، baseline تأییدشده، multi-label، summary مستقل
از فیلتر، pin ناسازگار، Target terminal و ترکیب pin نامعتبر را پوشش می‌دهد.
Integration با PostgreSQL واقعی سناریوی V1 current، V2 rejected و V3 ready را
می‌سازد و تفاوت V3→V2 تاریخی با V3→V1 جاری، pagination/filter، leading zero،
tenant isolation، خطاهای 404/409/422، read بدون mutation و payload Approval را
بررسی می‌کند. تست synchronization بدون sleep، تغییر pointer را وسط read متوقف و
ثابت می‌کند transaction `REPEATABLE READ` state دو لحظه را ترکیب نمی‌کند.

Frontend قرارداد Zod، query path و pin، AbortSignal، query keyهای scoped، invalidation
پس از تصمیم، نبود retry mutation و رابط دو گزارش را تست می‌کند. component tests
اثبات می‌کنند Approval از baseline گزارش استفاده می‌کند، `NO_CURRENT` مقدار null
می‌فرستد، فیلترها مستقل‌اند، خطای 409 confirmation را پاک می‌کند و non-latest،
Supplier غیرفعال، OPERATOR و Target terminal کنترل تصمیم را دور نمی‌زنند.

سه fixture در `fixtures/demo/current-price-impact/` با parser واقعی خوانده و
V1→V3 و V2→V3 به‌صورت regression عددی آزمون می‌شوند. fixtureهای baseline قبلی
بدون تغییر و با assertionهای اصلی خود باقی مانده‌اند.
