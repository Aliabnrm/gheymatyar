# امنیت و حریم داده

## دارایی‌های حساس

- فایل اصلی تأمین‌کننده
- قیمت خرید و تاریخچه آن
- قواعد سود
- اطلاعات مشتری و پیش‌فاکتور
- عضویت و نقش کاربران
- کلیدهای API و object storage
- audit trail

## مرزهای اعتماد

فایل آپلودی، نام فایل، سلول Excel، PDF، OCR، خروجی Vision، headerهای HTTP و داده فرانت‌اند همگی untrusted هستند.

## کنترل‌های ورودی فایل

- فقط XLSX در برش فعلی
- محدودیت پیش‌فرض ۱۰ MiB برای هر فایل
- کنترل پسوند و ZIP magic bytes
- بررسی ZIP central directory پیش از بازکردن workbook
- محدودیت تعداد entry، مجموع حجم بازشده و نسبت فشرده‌سازی archive
- ردکردن archive رمزگذاری‌شده
- بازکردن read-only و data-only
- عدم اجرای macro و formula
- محدودیت قابل تنظیم تعداد worksheet، ردیف و ستون
- ردکردن صریح فایل عبورکرده از محدودیت به‌جای قطع بی‌صدای ردیف‌ها
- پاک‌سازی نام فایل پیش از قراردادن در جزئیات خطا
- بستن UploadFileها در پایان درخواست، حتی هنگام خطا
- timeout و memory limit در worker
- نام object تصادفی؛ نام کاربر فقط metadata
- hash فایل برای idempotency و ممیزی

محافظت archive و ذخیره امن فایل اصلی در object storage خصوصی پیاده‌سازی شده است.
timeout سخت پردازش، memory limit سطح process و اسکن بدافزار همچنان پیش از پایلوت
عمومی لازم‌اند؛ پردازش Import در این مرحله synchronous است.

## کنترل‌های HTTP فعلی

- CORS با `allow_credentials` فقط برای origin تنظیم‌شده و localhost در development
- Origin allowlist برای register/login مرورگری
- session سمت سرور، Cookie HttpOnly و CSRF متصل به نشست
- پذیرش و تولید request ID با الگوی محدود
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- HSTS فقط در production؛ TLS باید در reverse proxy فعال باشد
- پاسخ خطای داخلی بدون stack trace یا پیام exception

## Tenancy

- Session دارای `organization_id` است و به یک سازمان جاری متصل می‌شود.
- organization جاری از session معتبر و membership متناظر استخراج می‌شود.
- شناسه ارسالی client مجوز دسترسی محسوب نمی‌شود.
- در هر درخواست، user فعال و membership همان user و `session.organization_id`
  دوباره از PostgreSQL خوانده می‌شوند.
- login فقط برای دقیقاً یک membership نشست می‌سازد؛ انتخاب تصادفی ممنوع است.
- تست negative برای دسترسی tenant دیگر الزامی است.
- query بدون tenant scope در repository چندسازمانی ممنوع است.
- تمام متدهای Supplier repository، `organization_id` جاری را اجباری دریافت و
  شرط آن را داخل SQL اعمال می‌کنند. شناسه tenant دیگر مانند شناسه ناموجود پاسخ
  داده می‌شود.
- SourceDocument، ImportRun و ExtractedRow علاوه بر Supplier با `organization_id`
  جاری داخل SQL محدود می‌شوند. mismatch سازمان/Supplier با composite foreign key
  در PostgreSQL نیز رد می‌شود.

## Authentication و نقش‌ها

نقش‌های MVP فقط `OWNER` و `OPERATOR` هستند. این محدودیت در enum دامنه، schema
API، CHECK constraint دیتابیس و role guard اعمال می‌شود. هر دو نقش می‌توانند فایل
XLSX را مقایسه کنند. Approval فقط برای OWNER پیاده‌سازی شده و مدیریت عضو هنوز خارج
از این برش است.

کنترل دسترسی Supplier:

در Supplier، هر دو نقش list/detail را می‌خوانند اما فقط OWNER مجاز به create،
rename و تغییر وضعیت است. POST/PATCH علاوه بر role guard به CSRF معتبر نیاز دارند.
غیرفعال‌سازی جایگزین حذف سخت است تا هویت و ارجاع تاریخی آینده حفظ شود.

کنترل دسترسی Import:

OWNER و OPERATOR می‌توانند فایل یک Supplier فعال را بارگذاری و history، detail و
rows را بخوانند. upload به CSRF معتبر نیاز دارد؛ GETها نیاز ندارند. Importهای قبلی
Supplier غیرفعال قابل مشاهده‌اند، اما upload جدید با conflict رد می‌شود. approval،
download و حذف Import در این مرحله وجود ندارد.

کنترل‌های Auth پیاده‌سازی‌شده:

- password با Argon2id و کتابخانه `argon2-cffi` hash می‌شود؛ حد ۱۲ تا ۱۲۸ نویسه
  پیش از Argon2 کنترل و hash/verify در threadpool اجرا می‌شود.
- برای ایمیل ناشناخته dummy verification انجام می‌شود و پیام email ناشناخته،
  password اشتباه و user غیرفعال یکسان است.
- Session یک token opaque با حداقل ۳۲ بایت entropy دارد؛ فقط SHA-256 آن در
  PostgreSQL است و token خام فقط در `gheymatyar_session` HttpOnly Cookie قرار می‌گیرد.
- CSRF token مستقل است؛ فقط hash آن کنار Session ذخیره و مقدار خام در
  `gheymatyar_csrf` قابل خواندن frontend قرار می‌گیرد.
- Cookieها `SameSite=Lax` و `Path=/` هستند؛ در production به‌صورت پیش‌فرض
  `Secure` و در development/test برای HTTP محلی بدون Secure هستند.
- TTL ثابت و پیش‌فرض هفت روز است؛ sliding session، JWT، refresh token و storage
  جاوااسکریپت وجود ندارد.
- logout فقط نشست جاری را با `revoked_at` می‌بندد و هر دو Cookie را حذف می‌کند.
- register در production به‌صورت پیش‌فرض خاموش است. onboarding مالک با command
  `gheymatyar-create-owner`، password بدون echo و همان use case ثبت‌نام انجام می‌شود.

برای درخواست‌های unsafe مبتنی بر Session، SameSite به‌تنهایی کافی نیست. logout،
compare، mutation تأمین‌کننده و upload Import باید Cookie CSRF، header
`X-CSRF-Token` و hash همان Session را با مقایسه
constant-time معتبر کنند. نبودن یا mismatch بدون نمایش token با 403 رد می‌شود.

استقرار production باید frontend و API را روی HTTPS و site سازگار با
`SameSite=Lax` ارائه کند. `WEB_ORIGIN` باید origin دقیق frontend باشد و wildcard
مجاز نیست. TLS/HSTS در reverse proxy پایان می‌یابد؛ Cookie session Domain ندارد.

## کنترل brute force

login limiter فعلی برای پایلوت تک‌پردازه طراحی شده است:

- کلید، SHA-256 ترکیب IP مستقیم `request.client` و ایمیل canonical/casefold است؛
  raw email ذخیره نمی‌شود.
- `X-Forwarded-For` بدون trusted-proxy configuration خوانده نمی‌شود.
- پیش‌فرض پنج شکست در پانزده دقیقه، حافظه bounded و پاک‌سازی entry منقضی است.
- موفقیت شمارنده همان کلید را پاک می‌کند و پاسخ محدودشده 429 و `Retry-After` دارد.

این limiter بین processها یا hostها توزیع‌شده نیست. پیش از scale افقی یا انتشار
عمومی، rate limit در reverse proxy یا adapter توزیع‌شده لازم است. Redis صرفاً برای
حل این مسئله وارد runtime این slice نشده است.

## Secrets

- secret در Git، image یا log قرار نمی‌گیرد.
- فایل .env فقط محلی و ignore است.
- production از secret manager استفاده می‌کند.
- کلیدها قابل rotation هستند.
- endpoint تولید S3 باید HTTPS باشد، credential از secret manager تأمین شود و
  مقدار پیش‌فرض development در production پذیرفته نشود.

## نگهداری فایل و سازگاری داده

- bucket فایل اصلی private است و endpoint دانلود یا URL عمومی ندارد.
- object key فقط از UUIDهای server-generated ساخته می‌شود و filename خام کاربر در
  مسیر object قرار نمی‌گیرد.
- SHA-256 فایل با scope سازمان و Supplier برای idempotency استفاده می‌شود؛ hash یا
  object key مدرک authorization نیست.
- خطای safety/container هیچ object یا رکوردی نگه نمی‌دارد. خطای کیفیت داده فایل
  اصلی و ImportRun ناموفق را نگه می‌دارد، اما ردیف جزئی ایجاد نمی‌کند.
- PostgreSQL و S3 transaction مشترک ندارند. شکست دیتابیس پس از upload با
  compensating delete جبران می‌شود، ولی در failureهای نادر cleanup خطر object
  orphan باقی می‌ماند و باید عملیاتی پایش و پاک‌سازی شود.

## Logging

مجاز:

- request id
- organization id داخلی
- زمان پردازش
- تعداد ردیف
- error code
- file hash کوتاه‌شده

غیرمجاز:

- کل محتوای فایل
- dump ردیف‌های قیمت
- object key، hash کامل فایل و نام فایل غیرضروری
- token، password و API key
- داده شخصی مشتری

## AI و Prompt Injection

در مراحل PDF/تصویر، متن سند ممکن است دستور مخرب داشته باشد. محتوای سند data است، نه instruction. مدل فقط schema محدود تولید می‌کند و هیچ tool یا مجوز انتشار ندارد. خروجی مدل باید validate و توسط انسان approve شود.

## پاسخ به رخداد

پیش از پایلوت عمومی باید موارد زیر وجود داشته باشد:

- مالک رخداد و کانال گزارش
- امکان revoke session و rotate secret
- backup و restore آزموده‌شده
- ثبت access و approval
- رویه اطلاع‌رسانی متناسب با نوع داده

## چک‌لیست انتشار

- dependency scan
- secret scan
- تست tenant isolation
- upload limits
- secure headers و CORS محدود
- TLS
- backup/restore
- خطا بدون stack trace
- ساخت OWNER اولیه با password اختصاصی و ثبت‌نام عمومی خاموش
- `AUTH_COOKIE_SECURE=true` و HTTPS/site سازگار
- rate limit توزیع‌شده یا reverse-proxy پیش از scale افقی
- bucket خصوصی و از پیش provisionشده، readiness storage و rotation credential
- timeout/memory limit و سیاست اسکن بدافزار پیش از دریافت فایل عمومی

## کنترل‌های نگاشت Sprint 3

- بازبینی، اجرای مجدد و Template با سازمان نشست و Supplier در SQL محدود می‌شوند.
- حتی UUID معتبر از tenant یا Supplier دیگر مجوز خواندن، correction یا ذخیره الگو نیست.
- تمام POSTهای جدید role guard و CSRF دارند؛ غیرفعال‌شدن Supplier زیر قفل DB دوباره بررسی می‌شود.
- Template به جای overwrite نسخه تازه می‌سازد؛ CAS با شناسه نسخه فعال و تأیید صریح مانع race است.
- پیش از اجرای مجدد، اندازه و SHA-256 فایل خصوصی بررسی می‌شود و body خوانده‌شده سقف upload دارد.
- preview فقط پنج ردیف و ۲۰۰ نویسه در هر سلول دارد؛ عنوان و مقدار با escaping React نمایش داده می‌شوند.
- فایل macro-enabled حتی با تغییر نام به XLSX رد می‌شود؛ read-only/data-only باقی است.
- انتخاب header/ستون دستی، کنترل برچسب تومان در preamble را دور نمی‌زند.
- مهلت ۱۵ثانیه‌ای در مرز ردیف‌ها و بررسی header اعمال می‌شود. توقف سخت وسط parsing کتابخانه
  و محدودیت حافظه سطح process همچنان موضوع hardening پیش از بار عمومی است.
- timeout، archive نامعتبر و تجاوز منابع هیچ سند پایداری نمی‌سازند.
- خطاهای ردیفی محدود و بدون مقدار سلول‌اند؛ فایل، قیمت‌های حجیم و امضای کامل عنوان‌ها log نمی‌شوند.

dimension اعلامی worksheet مبنای کوتاه‌کردن extraction نیست؛ بعد از کنترل سقف
اعلامی، reader ابعاد را از داده واقعی می‌خواند و سقف عرض/ردیف را حین پیمایش اعمال
می‌کند. بنابراین dimension کوچک جعلی نمی‌تواند ستون قیمت دوم یا ردیف‌های بعدی را
پنهان و فایل مبهم را به DRAFT موفق تبدیل کند. XML خراب نیز خطای پایدار فایل می‌دهد.

## کنترل‌های Version در Sprint 4

- تمام lookupهای Version و Item با Organization و Supplier نشست scope می‌شوند؛ UUID
  tenant یا Supplier دیگر همان پاسخ not-found را دارد.
- POST ساخت Version role guard OWNER/OPERATOR و CSRF دارد. فعال‌بودن Supplier داخل
  transaction و زیر lock دوباره بررسی می‌شود.
- `expected_previous_version_id`، lock Supplier و unique constraintهای دیتابیس مانع
  دو شاخه‌شدن lineage و replay تکراری یک Import می‌شوند.
- Version و تمام Itemها در یک transaction ساخته می‌شوند؛ failure میانی snapshot
  ناقص باقی نمی‌گذارد و هیچ FK مخرب با cascade به تاریخچه وجود ندارد.
- response ردیف Version، `raw_row` کامل Import، object key و محتوای فایل را منتشر
  نمی‌کند. گزارش‌های کامل، قیمت‌های حجیم و متن SQL log نمی‌شوند.
- هیچ endpoint ویرایش، حذف یا دانلود عمومی Version وجود ندارد. داده spreadsheet
  همچنان untrusted است و React آن را به‌صورت متن escape می‌کند.

## کنترل‌های Approval در Sprint 5

- Backend فقط OWNER دارای Session و CSRF معتبر را برای approve/reject می‌پذیرد؛
  پنهان‌کردن کنترل در Frontend مجوز محسوب نمی‌شود.
- Organization از Session گرفته و همه lookupها با Organization، Supplier و Version
  scope می‌شوند؛ cross-tenant همان 404 امن را می‌گیرد.
- Approval زیر lock دیتابیس latest بودن Version، فعال‌بودن Supplier، DRAFT بودن Import
  و `expected_current_version_id` را دوباره بررسی می‌کند.
- Review، pointer و Audit Event transaction واحد دارند؛ rollback هیچ state جزئی یا
  رویداد تکراری باقی نمی‌گذارد.
- Audit endpoint فقط GET است و details آن allowlist محدود شناسه/وضعیت/note دارد؛
  فایل، ردیف کامل، token، cookie و secret ذخیره یا log نمی‌شوند.

## کنترل‌های گزارش اثر بر قیمت جاری

- endpoint خواندنی فقط برای OWNER/OPERATOR دارای Session است و Organization را از
  Session می‌گیرد. Supplier، Target، Current و Itemها همگی tenant-scoped هستند.
- `baseline_version_id` فقط pin هم‌زمانی است، نه مدرک authorization. UUID خارج از
  scope lookup جدا یا metadata قابل مشاهده تولید نمی‌کند.
- target و baseline از VersionItemهای ذخیره‌شده خوانده می‌شوند؛ فایل untrusted
  دوباره parse یا اجرا نمی‌شود و متن کالا در React به‌صورت متن escape می‌شود.
- snapshot خواندن با transaction کوتاه read-only سازگار است. گزارش هیچ pointer،
  Review، Version، Item یا Audit Eventی ایجاد یا تغییر نمی‌دهد.
- تغییر Current پاسخ 409 می‌دهد، confirmation UI را پاک می‌کند و mutation Approval
  خودکار retry نمی‌شود. Backend همچنان OWNER، CSRF، latest، Supplier فعال و CAS را
  مستقل از UI کنترل می‌کند.
