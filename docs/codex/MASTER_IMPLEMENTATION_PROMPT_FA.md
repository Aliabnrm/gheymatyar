# پرامپت جامع اجرای پروژه در Codex

این متن برای شروع یک Task تازه در Codex است. قوانین دائمی و جزئی‌تر داخل AGENTS.md قرار دارند و باید همراه این پرامپت خوانده شوند.

---

تو مسئول ادامه توسعه پروژه قیمت‌یار در همین مخزن هستی. مانند یک مهندس ارشد Full-stack، معمار نرم‌افزار، مهندس امنیت و همکار محصول عمل کن. هدف، تحویل رفتار قابل استفاده و قابل تست است؛ نه تولید scaffolding نمایشی.

قبل از هر تغییر:

1. AGENTS.md را کامل بخوان.
2. README.md و اسناد مرتبط در docs را بخوان.
3. git status و ساختار فعلی مخزن را بررسی کن.
4. تست‌های موجود و fixtureهای Excel را اجرا یا علت عدم اجرا را مشخص کن.
5. فرض‌هایی را که رفتار محصول را تغییر می‌دهند شفاف اعلام کن.

ماموریت محصول:

یک وب‌اپ B2B فارسی برای عمده‌فروش‌های تجهیزات شبکه و دوربین مداربسته تهران بساز که دو نسخه لیست قیمت تأمین‌کننده را دریافت کند، داده استاندارد استخراج کند، تغییرات مهم را با دقت نمایش دهد و از استفاده از قیمت منسوخ یا تغییر بسته‌بندی گمراه‌کننده جلوگیری کند.

برش فعلی:

    انتخاب دو XLSX
    -> اعتبارسنجی فایل
    -> تشخیص header
    -> استخراج ردیف استاندارد
    -> تطبیق کد قطعی
    -> گزارش تغییرات چندبرچسبی
    -> نمایش فارسی RTL

قواعد غیرقابل مذاکره:

- پول فقط integer ریال است؛ float و تومان وارد domain نمی‌شود.
- کد کالا string است و صفر ابتدایی حفظ می‌شود.
- تغییر pack size و unit مستقل از تغییر price نمایش داده می‌شود.
- فایل و ردیف خام untrusted است.
- هیچ auto approval وجود ندارد.
- Excel ساختاریافته با AI پردازش نمی‌شود.
- domain به FastAPI، openpyxl، SQLAlchemy، React یا AI SDK وابسته نیست.
- معماری Modular Monolith است.
- scope فعلی را به حسابداری، پیش‌فاکتور، OCR یا AI Agent گسترش نده.

فناوری:

- Python 3.12+, FastAPI, Pydantic
- PostgreSQL, SQLAlchemy 2, Alembic در مرحله persistence
- Next.js App Router, TypeScript strict, RTL
- pytest, Ruff, mypy, Vitest, ESLint, tsc
- Docker Compose برای محیط محلی

fixture مرجع:

- fixtures/excel/supplier-price-list-v1-irr.xlsx
- fixtures/excel/supplier-price-list-v2-irr.xlsx
- fixtures/expected/price-list-v1-v2-changes.json

نتیجه اجباری fixture:

- 24 ردیف قدیم
- 24 ردیف جدید
- 2 added
- 2 removed
- 18 price changed
- 2 metadata-only changed
- 2 unchanged
- تغییر pack size برای ACC-RJ45-CAT6-100

روش اجرا:

1. یک vertical slice کوچک انتخاب کن.
2. ابتدا تست رفتاری failing بنویس.
3. domain را مستقل پیاده کن.
4. adapter و API را اضافه کن.
5. UI تمام حالت‌های loading، empty، success و error را پوشش دهد.
6. تست، lint، typecheck و build را اجرا کن.
7. اسناد و OpenAPI را با رفتار واقعی هماهنگ کن.
8. تغییرات unrelated کاربر را حفظ کن.

معیار پایان:

- نتیجه کاربر قابل استفاده باشد.
- fixture regression سبز باشد.
- خطاهای مهم تست شوند.
- Ruff، mypy، ESLint، TypeScript و build موفق باشند.
- secret یا artifact محلی وارد Git نشده باشد.
- security و tenancy برای هر persistence change بررسی شده باشد.
- گزارش نهایی دقیقاً بگوید چه ساخته شد، چه چیزی تست شد و چه ریسکی باقی مانده است.

اگر بین سرعت و قابلیت اعتماد قیمت تعارض بود، قابلیت اعتماد و قابلیت ممیزی اولویت دارد. اگر نیاز جدید فراتر از scope است، ابتدا اثر محصول و معماری را توضیح بده و بدون مجوز scope را گسترش نده.

اکنون وضعیت مخزن را بررسی کن و نزدیک‌ترین vertical slice ناتمام را تا Definition of Done کامل کن.
