# ADR 0010: تصمیم انسانی نسخه قیمت، اشاره‌گر قیمت جاری و Audit Log

- Status: Accepted
- Date: 2026-09-21

## مسئله

نسخه ثبت‌شده Sprint 4 یک snapshot تغییرناپذیر و قابل مقایسه است، اما صرف ثبت آن
نباید قیمت‌های شرکت را عملیاتی کند. قیمت‌یار باید تصمیم انسانی، نسخه جاری هر
تأمین‌کننده و شواهد ممیزی را بدون تغییر تاریخچه قیمت‌ها نگه دارد و در برابر صفحه
قدیمی، درخواست تکراری و تصمیم هم‌زمان مقاوم باشد.

## تصمیم

چهار مفهوم مستقل نگه داشته می‌شوند:

1. **Import Draft:** خروجی معتبر extraction؛ هنوز نسخه قیمت نیست.
2. **Registered Version:** snapshot تغییرناپذیر ساخته‌شده از Import.
3. **Approved Version:** Version دارای تصمیم نهایی انسانی با actor و زمان.
4. **Current Price Version:** اشاره‌گر مستقل Supplier به یک Version تأییدشده.

Review در جدول `price_list_version_reviews` و جدا از snapshot نگه داشته می‌شود.
نسخه تازه با `READY_FOR_REVIEW` ایجاد و فقط یک‌بار به `APPROVED` یا `REJECTED`
منتقل می‌شود. دو وضعیت نهایی terminal هستند؛ reopen، unapprove و تغییر تصمیم وجود
ندارد. Versionهای موجود migration فقط `READY_FOR_REVIEW` می‌شوند و هیچ current
pointer برای آن‌ها ساخته نمی‌شود.

Approval فقط برای آخرین Version ثبت‌شده Supplier مجاز است و در یک transaction:
Supplier، Version، Review و current pointer را lock می‌کند؛ فعال‌بودن Supplier،
معتبر بودن Import و latest بودن Version را دوباره می‌سنجد؛ current مشاهده‌شده
کاربر را با `expected_current_version_id` مقایسه می‌کند؛ Review را تأیید، pointer
را جابه‌جا و Audit Event را append می‌کند. Version جاری قبلی حذف یا رد نمی‌شود؛
APPROVED تاریخی باقی می‌ماند. Reject فقط Review و Audit را ثبت می‌کند و pointer را
تغییر نمی‌دهد.

ترکیب optimistic concurrency در API و lock دیتابیس لازم است: مقدار مورد انتظار
جلوی تصمیم روی صفحه stale را می‌گیرد و lock، درخواست‌های هم‌زمان را serialize
می‌کند. constraintهای composite و unique مرز نهایی دفاع هستند.

Audit Log append-only و tenant-scoped است. هر رویداد فقط action، actor، زمان،
شناسه Version، وضعیت قبل/بعد، اشاره‌گر قبل/بعد و یادداشت محدود تصمیم را نگه می‌دارد؛
فایل، ردیف کامل یا لیست قیمت در آن ذخیره نمی‌شود. API فقط list ارائه می‌کند.

تمام queryها هم‌زمان با `organization_id` نشست، `supplier_id` و `version_id`
محدود می‌شوند. شناسه سازمان از client دریافت نمی‌شود و منبع cross-tenant مانند
منبع ناموجود پاسخ می‌گیرد. فقط OWNER با Session، Origin و CSRF معتبر می‌تواند
تصمیم بگیرد؛ OWNER و OPERATOR خواندن وضعیت و Audit را دارند.

## پیامدها

- Version و VersionItem تاریخی هیچ update یا delete path ندارند؛ Approval فقط
  Review و current pointer را تغییر می‌دهد.
- هر Supplier حداکثر یک current pointer دارد و lookup آن مستقیم و index‌شده است.
- درخواست تکراری یا بازنده race به conflict پایدار می‌رسد و رویداد تکراری ندارد.
- اصلاح نسخه ردشده فقط با Import و Version تازه انجام می‌شود.
- UI باید conflict را نمایش دهد و detail، history، current و audit را تازه کند؛
  mutation خودکار تکرار نمی‌شود.

## گزینه‌های ردشده

- قراردادن `CURRENT` داخل Review Status: تاریخ تصمیم و انتخاب عملیاتی را مخلوط می‌کند.
- Approval خودکار هنگام ساخت Version: مرز بازبینی انسانی را حذف می‌کند.
- overwrite نسخه جاری یا نگهداری فقط آخرین قیمت: تاریخچه و قابلیت ممیزی را از بین می‌برد.
- حذف Version ردشده: شواهد تصمیم و منشأ خطا را پاک می‌کند.
- update کردن Version/Item هنگام Approval: immutability snapshot را نقض می‌کند.
- event bus، microservice، queue یا workflow engine عمومی: برای transaction محلی
  و حجم فعلی نیاز اثبات‌شده ندارد و پیچیدگی عملیاتی اضافه می‌کند.

