# گزارش Sprint 5 قیمت‌یار — Approval، Audit و قیمت جاری

## خروجی محصول

نسخه ثبت‌شده اکنون صفحه Review واقعی دارد. وضعیت «آماده بررسی»، «تأییدشده» یا
«ردشده»، تصمیم‌گیرنده، زمان، یادداشت، قیمت جاری و تاریخچه ممیزی نمایش داده می‌شود.
فقط OWNER می‌تواند پس از confirmation صریح نسخه آماده را تأیید یا با دلیل اجباری
رد کند؛ OPERATOR همان اطلاعات را فقط‌خواندنی می‌بیند.

State machine نهایی:

    Import DRAFT
        ↓ ساخت Version
    READY_FOR_REVIEW
        ├── APPROVED (terminal)
        └── REJECTED (terminal)

`CURRENT` status نیست. جدول مستقل `current_price_list_versions` برای هر Supplier
حداکثر یک اشاره‌گر دارد. Approval آخرین Version این pointer را اتمیک جابه‌جا می‌کند؛
نسخه جاری قبلی APPROVED تاریخی می‌ماند و Reject pointer را تغییر نمی‌دهد.

## معماری و داده

migration `20260921_0010` سه جدول زیر را اضافه می‌کند:

- `price_list_version_reviews` برای وضعیت و metadata تصمیم؛
- `current_price_list_versions` برای اشاره‌گر جاری؛
- `audit_logs` برای رویداد append-only تصمیم.

Versionهای موجود فقط به `READY_FOR_REVIEW` backfill می‌شوند و current خودکار ندارند.
Domain transition مستقل از framework است؛ use caseها confirmation را کنترل می‌کنند؛
adapter SQLAlchemy lock، CAS، transition، pointer و Audit Event را در یک transaction
انجام می‌دهد. جزئیات تصمیم در ADR 0010 ثبت شده است.

## API و UI

endpointهای جدید:

    POST /api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/approve
    POST /api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/reject
    GET  /api/v1/suppliers/{supplier_id}/price-list-versions/current
    GET  /api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/audit-events

list/detail نسخه نیز وضعیت review، actor/time/note و `is_current` را برمی‌گرداند.
UI فارسی RTL شامل badge وضعیت، کارت قیمت جاری Supplier، پنل تأیید/رد، دلیل رد،
confirmation، حالت pending، conflict امن، تصمیم terminal و timeline ممیزی است.

## امنیت و سازگاری هم‌زمان

- سازمان فقط از Session گرفته می‌شود و تمام queryها Organization+Supplier scoped هستند.
- تصمیم فقط برای OWNER و با CSRF معتبر مجاز است؛ Backend مرجع مجوز است.
- Approval فقط برای latest Version، Supplier فعال و Import نوع DRAFT انجام می‌شود.
- `expected_current_version_id` همراه lock دیتابیس از صفحه stale و race جلوگیری می‌کند.
- Audit در همان transaction تصمیم append می‌شود؛ update/delete endpoint ندارد.
- Audit details فقط metadata مجاز دارد و محتوا یا قیمت‌های حجیم را ذخیره نمی‌کند.

## تست و کنترل کیفیت

پوشش خودکار شامل transitionهای terminal، note، Approval/Reject، role، CSRF، tenant
isolation، current خالی و جایگزین‌شده، stale CAS، latest-only، race هم‌زمان، Audit
یکتا، schema/API/hook فرانت‌اند و حالت‌های loading، empty، read-only، conflict و
validation است.

نتیجه نهایی کنترل کیفیت:

- Backend: `163 passed, 1 skipped`؛ مورد skipped فقط integration اختیاری MinIO واقعی است.
- Frontend: `130 passed`.
- `make test`، `make lint`، Ruff، mypy روی ۱۳۰ فایل، ESLint، TypeScript، Prettier و
  build تولیدی Next.js با موفقیت اجرا شدند.
- `alembic check` و `alembic current` موفق بودند و migration جاری
  `20260921_0010 (head)` است.
- migration روی دیتابیس خالی و دیتابیس واقعی 0009 آزمایش شد: backfill دقیق
  `READY_FOR_REVIEW`، بدون current یا approval خودکار، با حفظ Version/Item در
  upgrade، downgrade و re-upgrade.
- در مرورگر واقعی، مشاهده OWNER و OPERATOR، read-only بودن OPERATOR، تأیید نسخه،
  نمایش و پایداری current پس از refresh، ثبت رد با confirmation و دلیل، terminal
  شدن وضعیت، timeline ممیزی و ثابت ماندن current قبلی بررسی شد.
- برای تست مرورگر از storage خصوصی درون‌حافظه‌ای استفاده شد، چون Docker/MinIO واقعی
  در محیط اجرا در دسترس نبود. بنابراین هیچ تأیید نادرستی درباره تست end-to-end با
  MinIO واقعی ثبت نشده است.
- داده سازمان، کاربر، Supplier، Importها، Versionها و Auditهای ساخته‌شده برای تست
  مرورگر پس از پایان سناریوها حذف شدند.

## محدودیت‌ها و ریسک باقی‌مانده

جست‌وجوی عملیاتی روی کالاهای قیمت جاری، quotation، rollback/unapprove، approval
چندمرحله‌ای، notification و background processing خارج از Sprint 5 هستند. comparison
هنوز snapshotها را در حافظه application می‌خواند و برای فایل‌های بسیار بزرگ پیش از
گسترش نیازمند benchmark است.
