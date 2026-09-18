# گزارش تحویل Sprint 3 قیمت‌یار

تاریخ: 2026-09-06

## قابلیت‌های ساخته‌شده

- تشخیص قطعی aliasهای فارسی/عربی/لاتین، ردیف عنوان و ترتیب متفاوت ستون‌ها.
- تشخیص صریح ستون یا header مبهم و جلوگیری از استخراج موفق آن.
- نمایش برگه، شماره عنوان، ستون‌ها و preview امن پنج‌ردیفی در جزئیات Import.
- انتخاب دستی هشت فیلد canonical؛ فقط کد، نام و قیمت ریالی اجباری‌اند.
- خطاهای فارسی با شماره ردیف، نام فیلد و code پایدار؛ گزارش حداکثر صد خطا با شمارش کل.
- اجرای اصلاحی روی همان SourceDocument با شناسه جدید و ارجاع parent؛ حفظ کامل Import قبلی.
- Template نسخه‌دار برای هر Supplier/Organization، استفاده در upload بعدی، و جایگزینی با تأیید صریح و کنترل race.
- تمایز پیشنهاد تازه، نگاشت استفاده‌شده، نسخه Template استفاده‌شده و Template فعال فعلی.
- کنترل OWNER/OPERATOR، CSRF، تأمین‌کننده غیرفعال، UUID میان‌سازمانی و FKهای tenant-scoped.
- بررسی hash/اندازه فایل اصلی پیش از اجرای مجدد و ذخیره اتمیک run/rows.
- حفظ raw_row و شماره ردیف؛ عنوان‌های خالی/تکراری داده ممیزی را حذف نمی‌کنند.
- سخت‌گیری قیمت float و جداکننده مبهم، رد macro-enabled با نام جعلی، XML خراب و dimension فریبنده.
- حالت‌های loading، empty، success و error در UI فارسی RTL با کنترل‌های دسترس‌پذیر.

هیچ PriceListVersion، approval، قیمت جاری، دانلود عمومی، AI یا dependency جدید اضافه نشده است.

## فایل‌های اصلی Sprint 3

تمام مسیرها نسبت به ریشه مخزن هستند. تغییرات ثبت‌نشده Sprint 2 پیش از شروع کار
موجود بودند و حفظ شدند؛ جدول زیر فایل‌های مؤثر همین Sprint را مشخص می‌کند.

| بخش | فایل‌ها |
| --- | --- |
| تصمیم معماری | `docs/adr/0008-deterministic-mapping-and-immutable-reruns.md` |
| migration | `backend/alembic/versions/20260906_0008_supplier_mapping_templates.py` و ثبت metadata در `backend/alembic/env.py` |
| دامنه | `backend/app/modules/price_lists/domain/mapping.py`، `errors.py`، `import_errors.py`، `import_models.py` و `normalization.py` |
| application | `mapping_dto.py`، `mapping_ports.py`، `mapping_services.py`، اتصال در `create_import.py`، `import_dto.py` و `import_ports.py` در `backend/app/modules/price_lists/application/` |
| infrastructure | `mapping_orm.py`، `mapping_repositories.py`، `threaded_mapping_extractor.py`، اصلاح `xlsx_extractor.py`، `s3_document_storage.py`، `import_orm.py` و `import_repositories.py` در `backend/app/modules/price_lists/infrastructure/` |
| HTTP | `mapping_schemas.py`، `mapping_router.py` و `import_schemas.py` در presentation؛ اتصال در `backend/app/main.py`، `backend/app/api/router.py` و `errors.py` |
| UI | `frontend/src/features/price-list-imports/components/column-mapping-panel.tsx`، `import-details-page.tsx` و `model/column-mapping.ts` |
| service فرانت‌اند | `frontend/src/services/price-list-imports/column-mapping.schema.ts`، `.api.ts`، `.hooks.ts` و توسعه `price-list-imports.schema.ts` |
| تست بک‌اند | `backend/tests/unit/test_column_mapping.py`، `backend/tests/integration/test_mapping_api.py` و گسترش storage fixture در `backend/tests/conftest.py` |
| تست فرانت‌اند | `column-mapping-panel.test.tsx`، `column-mapping.test.ts`، `column-mapping.hooks.test.tsx`، fixture نگاشت و تطبیق تست جزئیات Import |
| مستندات | README ریشه/بک‌اند/فرانت‌اند و `docs/API.md`، `DOMAIN.md`، `PRODUCT.md`، `ARCHITECTURE.md`، `SECURITY.md`، `TESTING.md` و `SPRINT_PLAN_FA.md` |

## نتایج کنترل کیفیت

- تست‌های focused دامنه، API، schema، hooks و component پاس شدند. برای رفتارهای اصلی، تست شکست‌خورده پیش از پیاده‌سازی ثبت و سپس پاس شد.
- `RUN_OBJECT_STORAGE_INTEGRATION=1 make test`: **۱۴۴ تست بک‌اند و ۹۶ تست فرانت‌اند موفق؛ بدون skip**.
- `make lint`: Ruff، mypy روی ۱۰۸ فایل، ESLint، TypeScript و Prettier همگی موفق.
- `ruff format --check app tests`: موفق؛ migration جدید نیز lint/format شد.
- `pnpm --dir frontend build`: موفق؛ مسیر جزئیات و بارگذاری Import ساخته شدند.
- `alembic check`: هیچ اختلاف schema و ORM وجود ندارد.
- migration از صفر و از 0007 دارای سند/Import تاریخی در دو دیتابیس موقت مستقل بررسی شد؛ همه ستون‌های قبلی عیناً برابر ماندند و ستون‌های افزوده null بودند.
- MinIO واقعی: ذخیره/خواندن فایل اصلی موفق؛ در تست‌های API نیز کنترل hash و خطای storage پوشش دارند.
- مرورگر واقعی: فایل سفارشی FAILED، انتخاب header/ستون، اجرای جدید DRAFT، حفظ `001-A` و source row ۳، ذخیره موفق Template و الزام تأیید جایگزینی بررسی شدند.
- baseline بدون تغییر: **۲۴ قدیم، ۲۴ جدید، ۲ اضافه، ۲ حذف، ۱۸ تغییر قیمت، ۲ تغییر فقط metadata، ۲ بدون تغییر** و تغییر بسته `ACC-RJ45-CAT6-100`.
- `git diff --check` موفق؛ fixtureهای baseline، فایل قفل dependency و تنظیمات نامرتبط کاربر بازنویسی نشدند. هیچ commit یا staging انجام نشده و فایل‌های موقت بررسی بیرون مخزن مانده‌اند.

## تصمیم معماری

ADR 0008، ImportRun را immutable نگه می‌دارد. correction، اجرای تازه با parent
برای همان SourceDocument است. Templateها UUID نسخه‌ای دارند؛ یک نسخه فعال در
هر scope وجود دارد و جایگزینی تحت قفل Supplier، unique index جزئی و شرط نسخه
مورد انتظار انجام می‌شود. actor، زمان، Import مرجع و تاریخچه نسخه‌های الگو audit
اختصاصی این برش را تشکیل می‌دهند. ایجاد جدول audit عمومی به Sprint approval تعلق دارد.

## محدودیت‌ها و ادامه کار

قابلیت‌های درخواستی این Sprint پیاده و بررسی شده‌اند. پردازش همچنان synchronous
است و مهلت ۱۵ثانیه‌ای در مرز پیمایش ردیف‌ها کنترل می‌شود؛ قطع سخت داخل parser و
memory limit سطح process برای hardening پیش از بار عمومی باقی است. انتقال به
worker طبق برنامه محصول به نیاز واقعی وابسته است.

سیاست Template محافظه‌کارانه است: تغییر عنوان/ترتیب/برگه/محل header موجب خطای
ناسازگاری می‌شود و به بازبینی صریح نیاز دارد. اصلاح مقدار واقعی سلول همچنان در
Excel و upload فایل تازه انجام می‌شود؛ این Sprint ویرایش عمومی داده یا ETL ندارد.
