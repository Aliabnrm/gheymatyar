# مدل دامنه

## Supplier

تأمین‌کننده موجودیتی متعلق به Organization است و با UUID عمومی شناخته می‌شود.
نام نمایشی با NFKC، حروف فارسی و فاصله canonical می‌شود و `normalized_name` برای
یکتایی casefold شده است. ترکیب `organization_id + normalized_name` یکتا است؛ نام
یکسان در دو سازمان مجاز است. Supplier حذف فیزیکی نمی‌شود و با `is_active` از
چرخه استفاده خارج یا دوباره فعال می‌شود. نام رکورد غیرفعال برای حفظ هویت تاریخی
همچنان رزرو می‌ماند.

## SourceDocument و ImportRun

`SourceDocument` فایل اصلی XLSX پذیرفته‌شده را به Organization، Supplier و کاربر
بارگذارکننده متصل می‌کند. محتوای فایل در object storage خصوصی است و PostgreSQL فقط
metadata شامل نام نمایش امن‌شده، media type، اندازه، SHA-256 و object key تولیدشده
توسط سرور را نگه می‌دارد. ترکیب
`organization_id + supplier_id + sha256_hex` یکتا است؛ بنابراین همان فایل برای همان
تأمین‌کننده دوباره Import نمی‌شود، ولی در سازمان یا تأمین‌کننده دیگر مجاز است.

هر upload پذیرفته‌شده یک `ImportRun` اولیه می‌سازد. وضعیت‌های این مرحله فقط:

- `DRAFT`: حداقل یک ردیف به‌صورت کامل ذخیره شده و blocking error ندارد.
- `FAILED`: هیچ ردیف استخراج‌شده‌ای ندارد و code، پیام فارسی و details امن خطای
  مسدودکننده را نگه می‌دارد.

ImportRun پس از ایجاد endpoint ویرایش یا حذف ندارد. اصلاح mapping یا اجرای دوباره
در Sprint 3 run جدید می‌سازد. `DRAFT` هنوز `PriceListVersion` تأییدشده یا قیمت
جاری نیست و هیچ approval خودکاری انجام نمی‌شود.

## ExtractedRow

ردیف canonical استخراج‌شده به Organization، Supplier و ImportRun متصل است. تمام
ردیف‌های DRAFT در یک transaction ذخیره می‌شوند و partial persistence مجاز نیست.
ترکیب `import_run_id + product_code_normalized` یکتا است. مقدار `raw_row` برای
ممیزی حفظ می‌شود، اما پیش از JSONB شدن فقط به مقدارهای JSON-safe تبدیل می‌شود.

## PriceListItem

ردیف استاندارد مستقل از قالب منبع:

- source_row_number
- product_code_raw
- product_code_normalized
- product_name_raw
- product_name_normalized
- brand
- unit
- pack_size
- price_irr
- availability
- availability_raw
- notes
- raw_row

قرارداد ماشین‌خوان پایه در contracts/extracted-price-row.schema.json قرار دارد.

## Money

- واحد canonical: IRR
- نوع ذخیره: integer مثبت
- اعشار مجاز نیست
- float ممنوع است
- متن تومان در MVP خطاست
- جداکننده‌های هزارگان فقط هنگام parse حذف و هنگام نمایش اضافه می‌شوند

مثال:

    12500000 = 12,500,000 IRR

## نرمال‌سازی کد

1. تبدیل مقدار به string بدون از بین بردن صفر ابتدایی.
2. حذف فاصله ابتدا و انتها.
3. تبدیل حروف لاتین به uppercase.
4. حذف فاصله‌های داخلی کد.
5. حفظ خط تیره و نشانه‌های معنادار.

کلید تطبیق:

    supplier_id + normalized_product_code

در Import پایدار، organization و supplier scope مستقیماً در داده و query اعمال
می‌شود. مقایسه stateless فعلی همچنان یک تأمین‌کننده را فرض می‌کند و کلید آن فقط
`normalized_product_code` است؛ endpoint مقایسه به persistence Import متصل نشده است.

## نرمال‌سازی متن فارسی

- ي به ی
- ك به ک
- حذف نیم‌فاصله و whitespace تکراری برای مقدار normalized
- تبدیل ارقام فارسی و عربی به لاتین هنگام parse عدد
- حفظ مقدار raw برای ممیزی

## Availability

- in_stock: موجود
- limited: محدود، کم
- out_of_stock: ناموجود
- unknown: هر مقدار ناشناخته یا خالی

عبارت سفارشی فعلاً unknown است و متن raw حفظ می‌شود.

## تغییرها

- ADDED
- REMOVED
- PRICE_CHANGED
- PACK_SIZE_CHANGED
- UNIT_CHANGED
- NAME_CHANGED
- BRAND_CHANGED
- AVAILABILITY_CHANGED
- NOTES_CHANGED
- UNCHANGED

یک ردیف می‌تواند چند change type داشته باشد.

## Summary semantics

- price_changed: هر کد مشترک که price_irr آن تغییر کرده است؛ حتی اگر metadata هم تغییر کرده باشد.
- metadata_only_changed: قیمت یکسان است اما حداقل یکی از فیلدهای غیرقیمت تغییر کرده است.
- unchanged: تمام فیلدهای مقایسه‌شونده یکسان‌اند.
- added و removed: بر اساس حضور کد normalized در نسخه جدید و قدیم.

این دسته‌های summary مانعةالجمع هستند، اما change_types داخل هر ردیف چندمقداری است.

## درصد تغییر

    percent = (new_price - old_price) / old_price * 100

محاسبه با Decimal انجام می‌شود و برای نمایش به دو رقم اعشار گرد می‌شود. old_price صفر در دامنه معتبر نیست.

## خطاهای مسدودکننده و سیاست نگهداری

خطاهای ایمنی container یا محدودیت منابع قبل از ذخیره object رد می‌شوند و هیچ
SourceDocument یا ImportRun نمی‌سازند:

- INVALID_FILE_TYPE
- FILE_TOO_LARGE
- EMPTY_FILE
- INVALID_XLSX_SIGNATURE
- XLSX_ARCHIVE_LIMIT_EXCEEDED
- ENCRYPTED_XLSX_NOT_SUPPORTED
- WORKBOOK_UNREADABLE
- WORKBOOK_SHEET_LIMIT_EXCEEDED
- WORKBOOK_ROW_LIMIT_EXCEEDED
- WORKBOOK_COLUMN_LIMIT_EXCEEDED

خطاهای کیفیت داده زیر فایل اصلی را نگه می‌دارند و ImportRun با وضعیت `FAILED`
می‌سازند، اما هیچ ExtractedRow جزئی ذخیره نمی‌شود:

- HEADER_NOT_FOUND
- REQUIRED_COLUMN_MISSING
- EMPTY_PRODUCT_CODE
- INVALID_PRODUCT_CODE
- EMPTY_PRODUCT_NAME
- DUPLICATE_PRODUCT_CODE
- INVALID_PRICE
- INVALID_PACK_SIZE
- TOMAN_NOT_SUPPORTED
- NO_PRODUCT_ROWS

هر دو گروه مانع تولید Draft قابل تأیید می‌شوند؛ تفاوت آن‌ها در نگهداری یا رد کامل
فایل است.

## نسخه‌بندی آینده

- Import Draft این مرحله snapshot فقط‌خواندنی است؛ correction در Sprint 3 run تازه می‌سازد.
- PriceListVersion Draft قابل اصلاح در مرحله versioning تعریف می‌شود.
- Approved immutable است.
- Approval شامل actor، timestamp و source document hash است.
- اصلاح پس از approval یک version جدید می‌سازد.
- قیمت قبلی update نمی‌شود.

## نگاشت و الگوی تأمین‌کننده — Sprint 3

طبق ADR 0008، CanonicalField هشت مقدار مشخص دارد و ColumnMapping، برگه، ردیف عنوان
و ستون‌های یک‌مبنا را نگه می‌دارد. کد، نام و قیمت اجباری‌اند؛ برند، واحد، تعداد
بسته، موجودی و توضیحات اختیاری‌اند. aliasهای قطعی فارسی/عربی و لاتین با normalization
مشترک خوانده می‌شوند؛ دو کاندید یک فیلد یا چند header هم‌امتیاز استخراج را مسدود می‌کند.

اصلاح با `parent_import_id` یک run تازه برای همان سند می‌سازد. Importهای تاریخی
حتی اگر FAILED باشند update نمی‌شوند. snapshot نگاشت، پیشنهاد، نگاشت استفاده‌شده،
شناسه Template و خطاهای محدود هر اجرا مستقل است. هیچ PriceListVersion جاری یا approved نداریم.

Template نسخه‌دار و tenant/supplier-scoped است؛ فقط یک نسخه فعال دارد و ذخیره
از DRAFT موفق با اقدام صریح کاربر انجام می‌شود. جایگزینی نیازمند تأیید و UUID
نسخه فعال دیده‌شده است. actor، زمان و Import مرجع در هر نسخه حفظ می‌شود. تغییر
عنوان، ترتیب ستون، برگه یا محل header به بازبینی و اجرای تازه نیاز دارد.

raw_row علاوه بر عنوان‌ها، مقدار همه ستون‌ها را با کلید `column_N` حفظ می‌کند؛
عنوان تکراری یا خالی داده ممیزی را حذف نمی‌کند. مقدارهای null و تاریخ نیز JSON-safe هستند.

قیمت float حتی اگر بخش اعشار آن صفر باشد رد می‌شود؛ نمایش علمی/اعشاری و
جداکننده هزارگان نامعتبر مانند `1,2`، `1,,000` و `1 2` هم خطاست. متن عدد صحیح
یا گروه‌های سه‌رقمی با جداکننده یکسان پذیرفته می‌شود. حدود عددی persistence
قبل از ذخیره کنترل می‌شوند: قیمت تا bigint مثبت و تعداد بسته تا integer مثبت.
