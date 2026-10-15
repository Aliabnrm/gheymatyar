# ADR 0011: مبنای Current و pinning گزارش اثر قیمت جاری

- وضعیت: پذیرفته‌شده
- تاریخ: ۱۴۰۵-۰۷-۲۲

## زمینه

ADR 0009 گزارش تاریخی Version را به predecessor ثبت‌شده و تغییرناپذیر آن متصل
کرد. ADR 0010 Review و Current pointer را جدا کرد. اگر میان V1 جاری و V3 آماده،
V2 ردشده باشد، گزارش تاریخی V3→V2 برای lineage درست است اما اثر Approval روی
قیمت عملیاتی را پاسخ نمی‌دهد.

## تصمیم

یک endpoint خواندنی مستقل با نام `current-impact` فقط برای Version دارای وضعیت
`READY_FOR_REVIEW` اضافه می‌شود. Target همان snapshot Version و baseline فقط
Version اشاره‌شده توسط `current_price_list_versions` همان Organization/Supplier است.
`get_latest` و `previous_version_id` fallback نیستند.

گزارش تاریخی `/changes` بدون تغییر می‌ماند. live report پس از terminalشدن Target
نمایش داده نمی‌شود، چون snapshot ثابتی از گزارش زمان تصمیم ذخیره نشده و معرفی آن
به‌عنوان شاهد تاریخی گمراه‌کننده است.

نبود Current یک وضعیت دامنه صریح `NO_CURRENT` است، نه comparison با مجموعه خالی.
در این وضعیت summary و items گزارش اثر null/خالی‌اند و کاربر کالاهای Target را از
جدول مستقل همان Version بازبینی می‌کند.

## consistency و pinning

یک read port کوچک نیاز گزارش را بدون گسترش Repository عمومی مدل می‌کند. adapter
SQLAlchemy، Supplier، Target+Review، latest id، Current+Review و Itemهای دو Version
را در transaction کوتاه `REPEATABLE READ, READ ONLY` می‌خواند. این انتخاب از ترکیب
stateهای دو لحظه جلوگیری می‌کند، بدون اینکه lock گزارش در زمان comparison یا
serialization نگه داشته شود. Version/Itemها immutable هستند؛ محاسبه پس از پایان
transaction امن است.

GET اول Current را resolve می‌کند. درخواست‌های بعد baseline UUID یا انتظار نبود
Current را pin می‌کنند. اگر pointer تغییر کرده باشد، پاسخ 409 است. UUID pin فقط
انتظار concurrency است و lookup یا authorization مستقل ایجاد نمی‌کند.

Approval همان baseline گزارش دیده‌شده را به‌عنوان `expected_current_version_id`
می‌فرستد. CAS و lock موجود در ADR 0010 مرجع write باقی می‌مانند. 409 confirmation
UI را باطل می‌کند و کاربر باید گزارش تازه را دوباره بررسی کند.

## پیامدها

- lineage تاریخی و سؤال عملیاتی هر دو با عنوان و قرارداد جدا قابل مشاهده‌اند.
- pagination نمی‌تواند بی‌صدا ردیف‌های دو baseline را ترکیب کند.
- الگوریتم دامنه `compare_price_lists` reuse می‌شود و business rule در route/React
  تکرار نمی‌شود.
- schema پایدار تازه‌ای لازم نیست؛ بنابراین migration جدید نداریم.
- این گزارش اعتبار امروز قیمت بازار یا موجودی لحظه‌ای را اثبات نمی‌کند.
- تهیه snapshot گزارش دقیق زمان تصمیم، در صورت نیاز، تصمیم و capability آینده است.

## گزینه‌های ردشده

- تغییر `/changes` به Current baseline: تاریخچه ADR 0009 را بی‌صدا بازنویسی می‌کند.
- استفاده از latest یا predecessor هنگام نبود Current: نسخه ردشده/بررسی‌نشده را
  مبنای عملیاتی جا می‌زند.
- خواندن با چند Repository و Session مستقل: امکان ترکیب Current/Review/Items دو
  لحظه را دارد.
- lockکردن Supplier/Current تا پایان serialization: Approval را بی‌دلیل معطل می‌کند.
- ذخیره گزارش مشتق‌شده، token امضاشده یا review-session: برای برش فعلی schema و
  پیچیدگی زائد ایجاد می‌کند؛ pin+CAS نیاز را پوشش می‌دهد.
