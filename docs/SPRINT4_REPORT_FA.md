# گزارش تحویل Sprint 4 قیمت‌یار

تاریخ: 2026-09-18

## نتیجه کاربر

کاربر اکنون Import معتبر را با آخرین نسخه ثبت‌شده همان تأمین‌کننده مقایسه می‌کند،
افزایش/کاهش قیمت، اضافه/حذف، تغییر metadata و هشدار مستقل واحد/بسته را می‌بیند و
پس از تأیید صریح یک snapshot تغییرناپذیر می‌سازد. تاریخچه، کالاها و گزارش تغییرات
هر Version قابل refresh است. اگر Import قبلاً Version ساخته باشد، UI لینک همان
Version و baseline تاریخی آن را نشان می‌دهد و ساخت تکراری پیشنهاد نمی‌شود.

نسخه ثبت‌شده در Sprint 4 نه Approved Version است و نه Current Price. هیچ Approval،
Reject، audit عمومی، quotation، AI، worker یا endpoint ویرایش/حذف اضافه نشده است.

## معماری و فایل‌های اصلی

| لایه | تغییر |
| --- | --- |
| domain | `version_models.py` و `version_errors.py` برای مدل‌های immutable، lineage و خطاهای پایدار |
| application | DTO/portهای Version، ساخت اتمیک، queryهای history/detail/items و change report |
| infrastructure | ORM و repositoryهای SQLAlchemy با tenant scope، lock و bulk insert |
| presentation | schema، dependency و router جدید زیر `/api/v1` و ترجمه مرکزی خطا |
| frontend service | Zod schema، API adapter، query-key factory و hooks در `services/price-list-versions` |
| frontend feature | summary، فیلتر، جدول تغییرات، پنل ساخت، history و صفحه مستقل detail |
| تست | domain/API regression و schema/API/hooks/component/architecture فرانت‌اند |
| مستندات | READMEها، اسناد محصول/دامنه/معماری/API/امنیت/تست/راه و ADR 0009 |

دامنه و application به FastAPI، Pydantic، SQLAlchemy، openpyxl یا React وابسته
نیستند. فایل XLSX برای comparison دوباره parse نمی‌شود و `compare_price_lists`
موجود با mapperهای کوچک دوباره استفاده شده است.

## Migration و constraintها

`20260918_0009_immutable_price_list_versions.py` دو جدول می‌سازد:

- `price_list_versions`: Organization، Supplier، Import منبع، predecessor، شماره،
  actor، row count و timestamp.
- `price_list_items`: snapshot کد/نام raw و normalized، brand، unit، pack size،
  integer IRR، availability، notes، source row و timestamp.

FKهای composite، Version و Item را به همان Organization/Supplier محدود می‌کنند.
شماره Version، Import منبع، predecessor child و کد normalized هر Version unique
هستند. check constraintها شماره/row count/source row/price/pack size را مثبت نگه
می‌دارند. حذف‌های تاریخی `RESTRICT` هستند و cascade مخرب وجود ندارد.

## API افزوده

    GET  /api/v1/suppliers/{supplier_id}/imports/{import_id}/comparison
    POST /api/v1/suppliers/{supplier_id}/imports/{import_id}/version
    GET  /api/v1/suppliers/{supplier_id}/price-list-versions
    GET  /api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}
    GET  /api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/items
    GET  /api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/changes

POST به Session، نقش OWNER/OPERATOR، CSRF، `confirm_create=true` و baseline مورد
انتظار نیاز دارد. `organization_id` از client پذیرفته نمی‌شود. پاسخ comparison
علاوه بر baseline و summary، Version ساخته‌شده از همان Import را برمی‌گرداند تا
UI رفتار idempotent و گزارش تاریخی درست داشته باشد.

## Immutability، tenancy و race

Version و Itemها append-only هستند و route update/delete ندارند. transaction ساخت
هیچ Import، ExtractedRow یا Version قبلی را update نمی‌کند. همه queryها Organization
و Supplier را هم‌زمان scope می‌کنند و دسترسی tenant دیگر 404 امن است.

ساخت Version ابتدا Supplier را `FOR UPDATE` می‌خواند، active بودن و Import را داخل
transaction بازبینی می‌کند، baseline فعلی را با مقدار دیده‌شده کاربر می‌سنجد و
سپس Version و تمام Itemها را atomic درج می‌کند. unique constraintهای شماره،
predecessor و Import، race دیتابیس را به خطای پایدار 409 تبدیل می‌کنند.

## UI و دسترس‌پذیری

UI فارسی RTL حالت‌های loading، no-baseline/first-version، summary، filter، empty،
pagination، server error، baseline conflict و Supplier غیرفعال را دارد. جدول‌ها
caption و header معنایی دارند، کنترل‌ها keyboard-friendly هستند، خطاها `role=alert`
دارند و معنا فقط به رنگ وابسته نیست. کد کالا با صفر ابتدایی، مبلغ با برچسب ریال و
درصد محدود نمایش داده می‌شود؛ متن spreadsheet با escaping React رندر می‌شود.

## کنترل کیفیت

- `make test`: **۱۵۱ تست backend موفق، ۱ تست اختیاری MinIO skip و ۱۱۴ تست frontend موفق**.
- `make lint`: Ruff، mypy روی ۱۲۱ فایل، ESLint، TypeScript و Prettier موفق.
- `pnpm --dir frontend build`: build تولیدی Next.js و route مستقل Version موفق.
- `ruff format --check app tests alembic/versions/20260918_0009_immutable_price_list_versions.py`: موفق.
- `alembic upgrade head` و `alembic check`: موفق و بدون operation جدید.
- migration روی دیتابیس موقت خالی تا head موفق بود.
- migration از 0008 دارای Organization، Supplier، SourceDocument، ImportRun،
  ExtractedRow و Mapping Template تاریخی موفق بود؛ شمارش‌ها، mapping origin و کد
  `001-A` ثابت ماندند و جدول‌های Version پس از upgrade خالی بودند.
- fixture مرجع: ۲۴ قدیم، ۲۴ جدید، ۲ اضافه، ۲ حذف، ۱۸ تغییر قیمت، ۲ تغییر صرفاً
  metadata، ۲ بدون تغییر و pack-size کالای `ACC-RJ45-CAT6-100` پاس شد.
- مرورگر واقعی: first-version، V1، summary و filter پرخطر V2، ساخت V2، history،
  refresh مستقیم detail، لینک Version موجود، baseline conflict و Supplier غیرفعال
  بررسی شدند. داده آزمایشی مرورگر پس از پایان از دیتابیس توسعه پاک شد.
- `git diff --check`: موفق؛ هیچ secret، cache، build output یا فایل موقت وارد Git نشد.

تست Object Storage واقعی در این اجرای نهایی فعال نبود و همان یک تست با شرط محیطی
skip شد؛ Sprint 4 در comparison/Version فایل را دوباره از storage نمی‌خواند و تست‌های
API آن از storage جعلی کنترل‌شده استفاده کردند. کنترل MinIO واقعی Sprint 3 تغییر نکرده است.

## محدودیت و ریسک باقی‌مانده

Comparison برای ساخت summary کامل، تمام ردیف‌های دو snapshot را در application
memory می‌خواند. برای هدف فعلی حدود ۱۰۰۰ ردیف مناسب است، اما پیش از فایل‌های بسیار
بزرگ باید benchmark و budget حافظه/زمان ثبت شود. پردازش XLSX نیز هنوز synchronous
و مبتنی بر threadpool است؛ worker فقط پس از نیاز عملیاتی واقعی اضافه می‌شود.

## مرز Sprint 5

Sprint 5 باید Approval و Reject صریح، actor/timestamp، audit log عمومی و تعریف
current price/version را اضافه کند. Version ثبت‌شده Sprint 4 ورودی آن workflow است؛
خود Version، صرف ثبت شدن، نباید به‌طور ضمنی تأیید یا جاری شود.
