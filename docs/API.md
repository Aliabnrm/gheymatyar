# قرارداد HTTP فعلی

تمام endpointهای محصول زیر `/api/v1` هستند. پاسخ‌های auth دارای
`Cache-Control: no-store` هستند. مرورگر باید Cookieها را با
`credentials: include` ارسال کند؛ session token هرگز در JSON برگردانده نمی‌شود.

## سلامت

    GET /health/live
    GET /health/ready

پاسخ:

    {"status":"ok"}

`live` به dependency خارجی وابسته نیست. `ready` یک `SELECT 1` روی PostgreSQL و
درخواست سبک دسترسی bucket خصوصی را اجرا می‌کند و در نبود هر dependency،
`503 SERVICE_NOT_READY` با قرارداد خطای امن می‌دهد.

## احراز هویت و سازمان جاری

### ثبت‌نام اولیه

    POST /api/v1/auth/register
    Content-Type: application/json

    {
      "email": "owner@example.com",
      "password": "a-secure-password",
      "organization_name": "شرکت نمونه"
    }

User، Organization، membership با نقش OWNER و Session در یک transaction ساخته
می‌شوند. پاسخ `201` context امن زیر و دو `Set-Cookie` دارد. اگر ثبت‌نام عمومی در
تنظیمات خاموش باشد، پاسخ `403 AUTH_REGISTRATION_DISABLED` است. ایمیل تکراری حتی
در race دیتابیس به `409 EMAIL_ALREADY_REGISTERED` تبدیل می‌شود.

### ورود

    POST /api/v1/auth/login

    {"email":"owner@example.com","password":"a-secure-password"}

پاسخ موفق `200` و همان context امن است. ایمیل ناشناخته، password اشتباه و کاربر
غیرفعال همگی `401 AUTH_INVALID_CREDENTIALS` با پیام یکسان دارند. اگر کاربر صفر یا
بیش از یک membership داشته باشد، API سازمانی را تصادفی انتخاب نمی‌کند و
`401 AUTH_CONTEXT_UNAVAILABLE` می‌دهد. پس از پنج شکست در پانزده دقیقه، پاسخ
`429 AUTH_RATE_LIMITED` همراه `Retry-After` برگردانده می‌شود.

برای register و login، اگر مرورگر header `Origin` بفرستد، مقدار آن باید دقیقاً در
allowlist `WEB_ORIGIN` باشد.

### کاربر جاری

    GET /api/v1/auth/me

پاسخ `200`:

    {
      "user": {
        "id": "10d13828-338a-4fc9-8b21-7fe4724935df",
        "email": "owner@example.com"
      },
      "organization": {
        "id": "6c01201c-dbec-4b43-a2e8-f876923441fc",
        "name": "شرکت نمونه"
      },
      "membership": {"role":"OWNER"}
    }

هیچ شناسه یا hash مربوط به Session و CSRF در پاسخ نیست.

### خروج

    POST /api/v1/auth/logout
    X-CSRF-Token: <value of gheymatyar_csrf cookie>

نشست جاری revoke، هر دو Cookie حذف و پاسخ `204` بدون body برگردانده می‌شود.

### Cookieها و CSRF

- `gheymatyar_session`: `HttpOnly`، `SameSite=Lax`، `Path=/` و در production
  دارای `Secure`. `Max-Age` و `Expires` با TTL ثابت نشست، پیش‌فرض هفت روز، هماهنگ‌اند.
- `gheymatyar_csrf`: قابل خواندن توسط frontend، با همان `Secure`، `SameSite`،
  `Path` و عمر. مقدار آن مستقل از session token است.
- برای mutation دارای session، logout، compare، Supplier و upload Import، frontend مقدار Cookie CSRF
  را در `X-CSRF-Token` می‌فرستد. header، Cookie و hash متصل به نشست باید با هم
  برابر باشند؛ در غیر این صورت پاسخ `403 CSRF_VALIDATION_FAILED` است.

## تأمین‌کنندگان

تمام routeها سازمان را از Session معتبر می‌گیرند و هیچ `organization_id` از
client نمی‌پذیرند. OWNER دسترسی read/write و OPERATOR دسترسی read-only دارد.

    GET /api/v1/suppliers?status=active&limit=20&offset=0

`status` یکی از `active`، `inactive` یا `all` است. پاسخ شامل `items`، `total`،
`limit` و `offset` است و بر اساس نام normalized و UUID مرتب می‌شود.

    POST /api/v1/suppliers
    X-CSRF-Token: <value of gheymatyar_csrf cookie>
    {"name":"فناوران شبکه"}

ایجاد موفق `201` است. نام canonical در هر سازمان یکتا است و conflict با
`409 SUPPLIER_NAME_ALREADY_EXISTS` برمی‌گردد.

    GET /api/v1/suppliers/{supplier_id}
    PATCH /api/v1/suppliers/{supplier_id}
    {"name":"نام جدید","is_active":false}

PATCH فقط برای OWNER و نیازمند CSRF است. حداقل یکی از `name` یا `is_active` باید
وجود داشته باشد. غیرفعال‌سازی رکورد را حذف نمی‌کند. شناسه ناموجود یا متعلق به
سازمان دیگر `404 SUPPLIER_NOT_FOUND` می‌دهد تا وجود داده tenant دیگر افشا نشود.

کدهای پایدار Supplier:

- `SUPPLIER_NOT_FOUND`
- `SUPPLIER_NAME_ALREADY_EXISTS`
- `INVALID_SUPPLIER_NAME`
- `SUPPLIER_UPDATE_EMPTY`

## Import پایدار فایل قیمت

این API در کنار compare stateless قرار دارد. سازمان فقط از Session معتبر استخراج
می‌شود و `organization_id` در path، query یا multipart پذیرفته نمی‌شود. OWNER و
OPERATOR هر دو Import را بارگذاری و مشاهده می‌کنند؛ Supplier باید برای upload فعال
باشد. همه GETها بدون CSRF و POST با CSRF متصل به Session اجرا می‌شود.

### بارگذاری و ایجاد Import

    POST /api/v1/suppliers/{supplier_id}/imports
    Content-Type: multipart/form-data
    X-CSRF-Token: <value of gheymatyar_csrf cookie>
    file=@supplier-price-list.xlsx

پاسخ `201` یک Import با وضعیت `DRAFT` یا `FAILED` است. DRAFT حداقل یک ردیف و
`blocking_error: null` دارد. FAILED دارای `row_count: 0` و code، پیام و details امن
خطای کیفیت داده است. فایل unsafe پیش از ساخت resource با خطای 413 یا 422 رد می‌شود.

    {
      "id": "8e82d09d-b29a-47dd-a5e8-8493d4a2f725",
      "supplier": {"id": "8afbc4ce-96d1-47c1-9fd0-830eca91d827", "name": "فناوران شبکه"},
      "source_document": {
        "id": "c69b56d1-cce1-48b9-afca-b27c8c0b9785",
        "original_filename": "price-list.xlsx",
        "media_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "size_bytes": 24576,
        "sha256_hex": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "created_at": "2026-09-03T10:00:00Z"
      },
      "status": "DRAFT",
      "row_count": 24,
      "blocking_error": null,
      "created_at": "2026-09-03T10:00:00Z",
      "completed_at": "2026-09-03T10:00:01Z"
    }

نمونه بخش وضعیت در پاسخ FAILED:

    {
      "status": "FAILED",
      "row_count": 0,
      "blocking_error": {
        "code": "REQUIRED_COLUMN_MISSING",
        "message": "ستون‌های اجباری فایل پیدا نشدند.",
        "details": {"missing_columns": ["price_irr"]}
      }
    }

همان SHA-256 در scope همان سازمان و Supplier دوباره Import نمی‌شود و
`409 IMPORT_FILE_ALREADY_EXISTS` می‌دهد. Supplier غیرفعال
`409 SUPPLIER_INACTIVE` و اختلال storage پاسخ `503 OBJECT_STORAGE_UNAVAILABLE`
دارد. object key یا credential ذخیره‌سازی در پاسخ نیست.

### تاریخچه، جزئیات و ردیف‌ها

    GET /api/v1/suppliers/{supplier_id}/imports?status=all&limit=20&offset=0
    GET /api/v1/suppliers/{supplier_id}/imports/{import_id}
    GET /api/v1/suppliers/{supplier_id}/imports/{import_id}/rows?limit=50&offset=0

`status` یکی از `draft`، `failed` یا `all` است. history بر اساس
`created_at DESC, id DESC` و rows بر اساس `source_row_number ASC, id ASC` مرتب
می‌شوند. پاسخ‌های list شامل `items`, `total`, `limit`, `offset` هستند. ردیف شامل
مقدارهای raw/canonical، brand، unit، pack size، قیمت integer ریالی، availability،
notes و `raw_row` JSON-safe است.

شناسه ناموجود، Import متعلق به Supplier دیگر و UUID سازمان دیگر همگی
`404 PRICE_LIST_IMPORT_NOT_FOUND` یا `404 SUPPLIER_NOT_FOUND` امن می‌دهند.
endpoint update، delete، download، approve یا retry در این مرحله وجود ندارد.

کدهای پایدار Import:

- `PRICE_LIST_IMPORT_NOT_FOUND`
- `IMPORT_FILE_ALREADY_EXISTS`
- `SUPPLIER_INACTIVE`
- `OBJECT_STORAGE_UNAVAILABLE`

## مقایسه دو لیست قیمت

    POST /api/v1/price-lists/compare
    Content-Type: multipart/form-data
    Cookie: gheymatyar_session=...
    X-CSRF-Token: <value of gheymatyar_csrf cookie>

فیلدها:

- old_file: نسخه قدیمی با پسوند XLSX
- new_file: نسخه جدید با پسوند XLSX

محدودیت فعلی هر فایل ۱۰ MiB است.

نمونه curl پس از login و ذخیره Cookieها:

    csrf=$(awk '$6 == "gheymatyar_csrf" {print $7}' cookies.txt)
    curl -b cookies.txt -X POST http://localhost:8000/api/v1/price-lists/compare \
      -H "X-CSRF-Token: $csrf" \
      -F old_file=@fixtures/excel/supplier-price-list-v1-irr.xlsx \
      -F new_file=@fixtures/excel/supplier-price-list-v2-irr.xlsx

## پاسخ موفق

ساختار سطح بالا:

- api_version
- currency که باید IRR باشد
- summary
- items

summary دسته‌های مانعةالجمع و شمارش افزایش/کاهش و high risk را ارائه می‌کند.

هر item شامل:

- product_code
- change_types
- previous و current
- field_changes
- price_delta_irr
- price_change_percent
- is_high_risk

price_change_percent به‌صورت string اعشاری برگردانده می‌شود تا تبدیل float ناخواسته در API رخ ندهد.

## پاسخ خطا

    {
      "error": {
        "code": "INVALID_FILE_TYPE",
        "message": "در نسخه فعلی فقط فایل XLSX پذیرفته می‌شود.",
        "details": {}
      },
      "request_id": "b7f4c2d88ee54f969f647a192f398ddd"
    }

کدهای Auth پایدار فعلی:

- `AUTH_REQUIRED`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_SESSION_EXPIRED`
- `AUTH_CONTEXT_UNAVAILABLE`
- `AUTH_REGISTRATION_DISABLED`
- `EMAIL_ALREADY_REGISTERED`
- `CSRF_VALIDATION_FAILED`
- `AUTH_RATE_LIMITED`

کدهای فایل در `docs/DOMAIN.md` ثبت شده‌اند. message برای نمایش مستقیم فارسی مناسب
است، اما client باید تصمیم برنامه‌نویسی را بر اساس code بگیرد.

این قرارداد برای خطاهای دامنه، اعتبارسنجی FastAPI، مسیر پیدا‌نشده و خطای داخلی یکسان است. جزئیات خطای اعتبارسنجی فقط شامل location، code و message است و مقدار خام ورودی بازگردانده نمی‌شود.

## شناسه درخواست

client می‌تواند header اختیاری `X-Request-ID` شامل حداکثر ۶۴ نویسه حرف، رقم، نقطه، خط تیره، زیرخط، دونقطه بفرستد. مقدار معتبر در header پاسخ و فیلد `request_id` خطا بازگردانده می‌شود. مقدار نامعتبر با شناسه امن سرور جایگزین می‌شود.

برای دسترسی مرورگر، `X-Request-ID` در CORS expose شده است.

## وضعیت HTTP

- 200: ورود، `/auth/me` یا مقایسه موفق
- 201: ثبت‌نام، ایجاد تأمین‌کننده یا ایجاد Import موفق
- 204: خروج موفق بدون body
- 401: credential یا نشست/context نامعتبر
- 403: ثبت‌نام خاموش، origin نامعتبر، CSRF یا نقش نامعتبر
- 409: ایمیل canonical تکراری
- 409: نام تأمین‌کننده یا hash فایل در scope آن تکراری، یا Supplier غیرفعال
- 413: حجم فایل بیش از حد مجاز
- 422: نوع، ساختار یا داده نامعتبر
- 429: محدودیت تلاش ورود، همراه `Retry-After`
- 503: PostgreSQL/Object Storage برای readiness یا عملیات Import آماده نیست
- 404: مسیر پیدا نشد
- 500: خطای داخلی امن و قابل رهگیری

## OpenAPI

هنگام اجرای API:

- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

OpenAPI تولیدشده منبع قرارداد transport است. مدل domain مستقل باقی می‌ماند.

## Sprint 3: نگاشت ستون و اجرای مجدد

همه مسیرهای زیر Session سازمانی معتبر می‌خواهند. OWNER و OPERATOR هر دو مجازند؛
POSTها CSRF می‌خواهند و Supplier غیرفعال فقط خواندنی است. هیچ مسیر دانلودی اضافه نشده است.

### بررسی نگاشت

    GET /api/v1/suppliers/{supplier_id}/imports/{import_id}/mapping
    GET /api/v1/suppliers/{supplier_id}/imports/{import_id}/mapping?sheet_name=Sheet&header_row=2

بدون پارامتر، snapshot همان اجرا برمی‌گردد. با پارامتر، فایل اصلی دوباره بررسی
می‌شود و فقط پیشنهاد تازه برمی‌گردد؛ اجرای تاریخی تغییر نمی‌کند. Import قدیمی
فاقد snapshot نیز پیشنهاد تازه دریافت می‌کند و `historical_snapshot=false` دارد.

پاسخ شامل `inspection`، `saved_template` (یا null)، `can_edit` و
`historical_snapshot` است. inspection شامل این فیلدهاست:

- `sheets`: برگه‌های قابل انتخاب
- `detected_mapping`: پیشنهاد قطعی روی عنوان انتخاب‌شده
- `used_mapping`: نگاشت واقعاً استفاده‌شده برای استخراج؛ در پیشنهاد یا نگاشت مسدودشده null
- `origin`: یکی از `detected`، `manual`، `template` و `proposal`
- `template_id`: نسخه الگوی استفاده‌شده یا null؛ با الگوی فعال فعلی اشتباه نشود
- `columns`: شماره یک‌مبنای ستون و عنوان نمایشی حداکثر ۲۰۰ نویسه
- `ambiguous_fields`: فیلد و شماره ستون‌های کاندید متعدد
- `preview`: حداکثر پنج ردیف با `source_row_number` و `values`؛ حداکثر ۲۰۰ نویسه در هر سلول
- `issues`: حداکثر صد خطا با `row`، `field`، `code` و `message` فارسی
- `total_errors` و `errors_truncated`: شمارش کل خطاهای گزارش‌شده و اعلام محدودشدن نمایش

برای خطای ساختار، row و field ممکن است null باشند. قیمت‌ها و سلول‌ها در خطا
بازنشر نمی‌شوند. امضای کامل عنوان‌ها در persistence خصوصی نگهداری می‌شود و در API نیست.

نمونه خطای ردیفی:

    {"row":8,"field":"price_irr","code":"INVALID_PRICE","message":"قیمت باید یک عدد صحیح مثبت به ریال باشد."}

### ساخت اجرای اصلاحی

    POST /api/v1/suppliers/{supplier_id}/imports/{import_id}/rerun
    X-CSRF-Token: <csrf cookie>
    Content-Type: application/json

    {
      "sheet_name":"Sheet",
      "header_row":2,
      "columns":{"product_code":1,"product_name":2,"price_irr":3}
    }

فیلدهای canonical مجاز: `product_code`، `product_name`، `brand`، `unit`،
`pack_size`، `price_irr`، `availability` و `notes`. سه فیلد اولویت‌دار اجباری
کد، نام و قیمت‌اند؛ بقیه اختیاری‌اند. شماره‌ها یک‌مبنا و integer هستند و استفاده
یک ستون برای دو فیلد رد می‌شود. organization_id یا فیلد ناشناخته پذیرفته نمی‌شود.

پاسخ 201 همان قرارداد Import است، با `parent_import_id` و `mapping_snapshot`.
SourceDocument قبلی حفظ می‌شود؛ id اجرا تازه است. داده نامعتبر FAILED با صفر
ExtractedRow می‌سازد. نگاشت ناقص/تکراری در command با 422 رد می‌شود؛ ستون ناموجود
در فایل، اجرای FAILED می‌سازد. هیچ approval یا PriceListVersion ساخته نمی‌شود.
GET جزئیات و تاریخچه نیز دو فیلد جدید را دارند؛ برای Import پیش از migration هر دو null هستند.

### ذخیره الگو و جایگزینی

    GET /api/v1/suppliers/{supplier_id}/mapping-template

پاسخ 200 الگوی فعال یا null است: `id`، `source_import_id`، `created_at` و `mapping`.

    POST /api/v1/suppliers/{supplier_id}/mapping-template
    {"source_import_id":"10d13828-338a-4fc9-8b21-7fe4724935df"}

ذخیره فقط از اجرای DRAFT با snapshot نگاشت موفق مجاز است. پس از اصلاح، ابتدا
اجرای تازه بسازید، سپس الگوی همان اجرا را ذخیره کنید. پاسخ 201 نسخه تازه الگو است.
برای جایگزینی، UUID نسخه‌ای که کاربر دیده و تأیید صریح هر دو الزامی‌اند:

    {
      "source_import_id":"10d13828-338a-4fc9-8b21-7fe4724935df",
      "expected_template_id":"6c01201c-dbec-4b43-a2e8-f876923441fc",
      "confirm_replace":true
    }

اگر نسخه فعال در فاصله بررسی تا ذخیره عوض شود، 409 می‌آید. دو درخواست هم‌زمان
تنها یک برنده دارند. جایگزینی هیچ Import قدیمی را تغییر نمی‌دهد.

### خطاهای افزوده

- `AMBIGUOUS_COLUMN_MAPPING`: بیش از یک ستون کاندید یک فیلد
- `AMBIGUOUS_HEADER`: چند ردیف یا برگه کاندید عنوان
- `INVALID_COLUMN_MAPPING`: ردیف/ستون نامعتبر یا انتخاب تکراری
- `TEMPLATE_LAYOUT_MISMATCH`: قالب جدید با الگوی فعال سازگار نیست؛ fallback خودکار ندارد
- `MAPPING_TEMPLATE_CONFLICT` (409): تأیید یا نسخه مورد انتظار با الگوی فعال سازگار نیست
- `MAPPING_TEMPLATE_REQUIRES_DRAFT` (422): نگاشت اجرای موفق برای ذخیره وجود ندارد
- `SOURCE_DOCUMENT_CHANGED` (409): اندازه یا SHA-256 فایل ذخیره‌شده تغییر کرده است
- `WORKBOOK_PROCESSING_TIMEOUT` (422): مهلت همکاری‌پذیر ۱۵ثانیه‌ای پردازش تمام شده است

UUID سازمان دیگر مانند رکورد ناموجود پاسخ 404 می‌گیرد. خطای storage، 503 امن
و خطای داخلی، 500 بدون متن SQL، فایل یا stack trace برمی‌گرداند.
