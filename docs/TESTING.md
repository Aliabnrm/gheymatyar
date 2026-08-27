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

### Fixture regression

دو فایل fixtures/excel باید همیشه summary ثبت‌شده در fixtures/expected را تولید کنند. این تست مهم‌ترین قرارداد فعلی است.

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

### File security

- سقف ردیف، ستون و worksheet
- سقف مجموع حجم بازشده archive
- ردکردن صریح فایل عبورکرده از محدودیت
- پاک‌سازی filename traversal

### Frontend

- format ریال
- انتخاب فایل و validation
- loading و disabled state
- summary
- فیلتر جدول
- نمایش error

### End-to-End

پس از پایدارشدن محیط:

1. بازکردن داشبورد
2. انتخاب V1 و V2
3. اجرای مقایسه
4. کنترل summary
5. کنترل تغییر pack size

## Quality gates

Backend:

    cd backend
    uv run ruff format --check app tests
    uv run ruff check app tests
    uv run mypy app
    uv run pytest

Frontend:

    vitest
    eslint
    tsc --noEmit
    next build

## Coverage

عدد coverage به‌تنهایی معیار پذیرش نیست. حداقل پیشنهادی برای domain برابر ۹۰٪ branch coverage است. presentation می‌تواند کمتر باشد به شرط تست رفتارهای پرریسک.

## Fixture policy

- فایل‌ها باید ساختگی یا بی‌نام باشند.
- قیمت واقعی یا داده مشتری بدون اجازه وارد Git نمی‌شود.
- هر bug استخراج مهم یک regression fixture کوچک می‌گیرد.
- fixture بزرگ فقط وقتی نگه داشته می‌شود که حالت واقعی را پوشش دهد.

## تست‌های امنیتی الزامی آینده

- tenant escape
- formula injection در export
- timeout OCR/Vision
- prompt injection در سند
