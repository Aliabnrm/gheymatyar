# ADR 0009: نسخه ثبت‌شده تغییرناپذیر و مقایسه با baseline تاریخی

- Status: Accepted
- Date: 2026-09-18

## مسئله

ImportRun نتیجه یک اجرای extraction است، نه سابقه قیمت قابل اتکا. کاربر برای فهم
تغییرات نباید دو فایل را دستی کنار هم بگذارد و مقایسه Import جدید نیز نباید با
ساخت نسخه‌های بعدی عوض شود. از سوی دیگر، Sprint 4 هنوز workflow تأیید نهایی و
تعریف قیمت جاری ندارد؛ یکی‌گرفتن «ثبت snapshot» با Approval می‌تواند اعتماد کاذب
ایجاد کند.

## تصمیم

پنج مفهوم زیر جدا نگه داشته می‌شوند:

1. **Import Draft:** خروجی معتبر و فقط‌خواندنی یک extraction. correction، ImportRun
   تازه می‌سازد و اجرای قبلی را تغییر نمی‌دهد.
2. **Immutable PriceListVersion:** snapshot صریح و ثبت‌شده از تمام ردیف‌های canonical
   یک Import نوع DRAFT. پس از ساخت قابل ویرایش یا حذف از API نیست، اما approved نیست.
3. **Reference/Baseline Version:** نسخه مرجع comparison. برای Import نسخه‌نشده، آخرین
   Version همان Supplier است؛ برای Import نسخه‌شده، predecessor ثبت‌شده همان Version است.
4. **Approved Version:** تصمیم انسانی آینده با actor، زمان، دلیل و audit؛ در Sprint 5.
5. **Current Price:** انتخاب عملیاتی قیمت قابل استفاده که فقط پس از تعریف Approval
   و سیاست current ممکن است؛ در Sprint 5 و بعد از آن.

هر Version شماره افزایشی یکتا، Import منبع و `previous_version_id` دارد. Version اول
predecessor ندارد و هر Version بعدی دقیقاً به آخرین Version مشاهده‌شده متصل می‌شود.
ساخت، Supplier را lock می‌کند، active بودن را دوباره می‌سنجد، مقدار
`expected_previous_version_id` را مقایسه و Version و همه Itemها را در یک transaction
درج می‌کند. unique constraintهای دیتابیس مرز نهایی race هستند.

Comparison فقط از داده canonical ذخیره‌شده استفاده می‌کند و XLSX را دوباره parse
نمی‌کند. summary پیش از filter/pagination روی کل داده محاسبه می‌شود. گزارش changes
هر Version همیشه از predecessor خودش استفاده می‌کند؛ بنابراین append نسخه تازه
گزارش‌های تاریخی را تغییر نمی‌دهد.

تمام FKها و queryها Organization و Supplier را در scope دارند. حذف cascade برای
Supplier، Import، predecessor یا Version item پذیرفته نیست. پول در VersionItem فقط
integer مثبت IRR و کد کالا string با صفر ابتدایی است.

## پیامدها

- کاربر یک baseline پایدار و تاریخچه قابل ممیزی دارد، بدون ادعای تأیید نهایی.
- optimistic concurrency و lock مانع شاخه‌شدن lineage می‌شوند؛ درخواست بازنده باید
  change report تازه را ببیند و دوباره تصمیم بگیرد.
- snapshot کردن ردیف‌ها storage بیشتری مصرف می‌کند، اما Version مستقل از تغییرات
  بعدی Import، Template و mapping باقی می‌ماند.
- comparison فعلاً همه ردیف‌های دو snapshot را در حافظه می‌خواند. برای هدف حدود
  ۱۰۰۰ ردیف ساده و قابل اتکاست؛ benchmark و read model بزرگ‌تر فقط با نیاز واقعی.
- Approval، Reject، audit عمومی و current pointer عمداً حل نشده‌اند.

## گزینه‌های ردشده

- **استفاده مستقیم از آخرین Import به‌عنوان baseline:** Import correction و FAILED
  معنای baseline قابل اعتماد ندارند.
- **نام‌گذاری Version به‌عنوان approved/current:** workflow و شواهد لازم هنوز وجود ندارد.
- **overwrite نسخه یا Item تاریخی:** audit و گزارش ثابت را از بین می‌برد.
- **ذخیره جدول price_changes به‌عنوان منبع حقیقت:** داده مشتق‌شده ممکن است از snapshot
  جدا شود؛ محاسبه قطعی برای اندازه MVP کافی است.
- **قفل فقط آخرین Version بدون CAS client:** کاربر ممکن است تغییرات را نسبت به baseline
  قدیمی ببیند و snapshot دیگری بسازد.
- **Redis، queue یا microservice:** برای transaction و حجم فعلی نیاز اثبات‌شده‌ای ندارد.
