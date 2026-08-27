# مدل دامنه

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

در مقایسه stateless فعلی، یک تأمین‌کننده فرض می‌شود و کلید همان normalized_product_code است.

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

## خطاهای مسدودکننده

- INVALID_FILE_TYPE
- FILE_TOO_LARGE
- INVALID_XLSX_SIGNATURE
- WORKBOOK_UNREADABLE
- HEADER_NOT_FOUND
- REQUIRED_COLUMN_MISSING
- EMPTY_PRODUCT_CODE
- DUPLICATE_PRODUCT_CODE
- INVALID_PRICE
- TOMAN_NOT_SUPPORTED

خطای مسدودکننده مانع تولید نتیجه قابل تأیید می‌شود.

## نسخه‌بندی آینده

- Draft قابل اصلاح است.
- Approved immutable است.
- Approval شامل actor، timestamp و source document hash است.
- اصلاح پس از approval یک version جدید می‌سازد.
- قیمت قبلی update نمی‌شود.
