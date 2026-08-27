# قرارداد HTTP فعلی

## سلامت

    GET /health/live
    GET /health/ready

پاسخ:

    {"status":"ok"}

## مقایسه دو لیست قیمت

    POST /api/v1/price-lists/compare
    Content-Type: multipart/form-data

فیلدها:

- old_file: نسخه قدیمی با پسوند XLSX
- new_file: نسخه جدید با پسوند XLSX

محدودیت فعلی هر فایل ۱۰ MiB است.

مثال:

    curl -X POST http://localhost:8000/api/v1/price-lists/compare \
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

کدهای مهم در docs/DOMAIN.md ثبت شده‌اند. message برای نمایش مستقیم فارسی مناسب است، اما client باید تصمیم برنامه‌نویسی را بر اساس code بگیرد.

این قرارداد برای خطاهای دامنه، اعتبارسنجی FastAPI، مسیر پیدا‌نشده و خطای داخلی یکسان است. جزئیات خطای اعتبارسنجی فقط شامل location، code و message است و مقدار خام ورودی بازگردانده نمی‌شود.

## شناسه درخواست

client می‌تواند header اختیاری `X-Request-ID` شامل حداکثر ۶۴ نویسه حرف، رقم، نقطه، خط تیره، زیرخط، دونقطه بفرستد. مقدار معتبر در header پاسخ و فیلد `request_id` خطا بازگردانده می‌شود. مقدار نامعتبر با شناسه امن سرور جایگزین می‌شود.

برای دسترسی مرورگر، `X-Request-ID` در CORS expose شده است.

## وضعیت HTTP

- 200: مقایسه موفق
- 413: حجم فایل بیش از حد مجاز
- 422: نوع، ساختار یا داده نامعتبر
- 404: مسیر پیدا نشد
- 500: خطای داخلی امن و قابل رهگیری

## OpenAPI

هنگام اجرای API:

- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json

OpenAPI تولیدشده منبع قرارداد transport است. مدل domain مستقل باقی می‌ماند.
