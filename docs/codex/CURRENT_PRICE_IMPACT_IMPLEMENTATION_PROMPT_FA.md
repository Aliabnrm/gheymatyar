# پرامپت اجرای قابلیت «اثر نسخه جدید بر قیمت جاری»

این متن را برای اجرای یک Task در مخزن قیمت‌یار به Codex بده. هدف، اجرای همین قابلیت تا پایان است. تهیه برنامه یا Spec به‌تنهایی پایان کار نیست.

---

تو مسئول پیاده‌سازی end-to-end قابلیت «اثر نسخه جدید بر قیمت جاری تأییدشده» در همین مخزن هستی. با روش Spec-driven development، ابتدا رفتار و قرارداد قابل آزمون را بنویس، سپس تست failing، پیاده‌سازی، کنترل کیفیت و دموی قابل تکرار را تحویل بده. توضیحات محصول، Spec، خطاها، مستندات و گزارش نهایی فارسی روشن باشند؛ نام کد، interface و machine error code انگلیسی بمانند.

## ۱. هدف محصول و سناریوی اصلی

کاربر می‌خواهد پیش از تأیید یک نسخه جدید، بداند انتخاب آن چه تغییری در قیمت جاری واقعی تأمین‌کننده ایجاد می‌کند. گزارش تاریخی موجود با predecessor ثبت‌شده مقایسه می‌شود. predecessor ممکن است ردشده یا تأییدنشده باشد؛ بنابراین این گزارش همیشه پاسخ سؤال عملیاتی کاربر نیست.

سناریوی مرجع:

- V1 تأییدشده و current است.
- V2 ثبت و سپس رد می‌شود؛ V1 همچنان current می‌ماند.
- V3 ثبت و READY_FOR_REVIEW می‌شود و predecessor آن V2 است.
- گزارش تاریخی V3 باید همچنان V3 نسبت به V2 باشد.
- گزارش جدید «اثر بر قیمت جاری» باید V3 نسبت به V1 باشد.
- مالک هر دو مبنا را به‌وضوح تشخیص دهد و فقط با تأیید صریح V3 را current کند.

این دو گزارش سؤال متفاوتی را پاسخ می‌دهند. رفتار تاریخی مطابق ADR 0009 است؛ آن را به‌عنوان باگ بازنویسی نکن.

## ۲. بررسی مخزن پیش از تغییر

ابتدا cwd، ساختار و git status را بررسی کن و AGENTS.md ریشه و نزدیک‌ترین AGENTS.md را بخوان. فایل‌های modified و untracked فعلی را بخشی از وضعیت کاری کاربر بدان؛ reset، stash، clean، checkout یا حذف نکن و به بهانه untrackedبودن دوباره نساز.

منابع ضروری:

- README.md و READMEهای backend و frontend.
- docs/PRODUCT.md، docs/DOMAIN.md، docs/ARCHITECTURE.md، docs/API.md، docs/SECURITY.md، docs/TESTING.md، docs/ROADMAP.md و بخش‌های مرتبط docs/SPRINT_PLAN_FA.md.
- ADRهای 0009 و 0010 و docs/SPRINT4_REPORT_FA.md و docs/SPRINT5_REPORT_FA.md.
- AGENTS.md فرانت‌اند و راهنمای مرتبط نسخه نصب‌شده Next در node_modules/next/dist/docs؛ پیش از تغییر کد فرانت‌اند رعایت شود.
- contracts/extracted-price-row.schema.json و fixtures/excel و fixtures/expected.
- Makefile، backend/pyproject.toml، frontend/package.json و تنظیمات تست/CI موجود.

docs/codex/MASTER_IMPLEMENTATION_PROMPT_FA.md درباره نبود persistence متن قدیمی دارد. این ادعای قدیمی را مبنای بازسازی سیستم نگذار؛ کد و ADRهای پذیرفته‌شده جدید را بررسی کن. قابلیت‌های Supplier، Import، mapping، Version و Approval در وضعیت کاری فعلی وجود دارند.

مسیرهای مرتبط فعلی، با تأیید وجود و محتوای واقعی:

- backend/app/modules/price_lists/domain/comparison.py، models.py، version_models.py، approval_models.py و فایل‌های errors.
- application/change_reports.py، version_queries.py، version_ports.py، version_dto.py، approval_queries.py، approval_ports.py، approve_price_list_version.py و version_services.py.
- infrastructure/version_repositories.py، approval_repositories.py، version_orm.py و approval_orm.py.
- presentation/version_router.py، version_schemas.py و version_dependencies.py و app/api/errors.py.
- frontend/src/features/price-list-versions/components/version-details-page.tsx، version-approval-panel.tsx، price-list-change-table.tsx، change-summary-cards.tsx، current-version-card.tsx و version-audit-timeline.tsx.
- frontend/src/services/price-list-versions/ و core/api و core/query.
- backend/tests/unit/test_price_list_versions.py، test_price_list_approval.py و integration/test_price_list_versions_api.py و test_price_list_approval_api.py.
- frontend/tests/unit/services/price-list-versions/، tests/component/features/price-list-versions/ و tests/architecture/.

فرض‌های مؤثر بر محصول و baseline تست‌های مرتبط را ثبت کن؛ مسائل محیطی یا شکست‌های از قبل موجود را از regression جدید جدا کن. برای تصمیم‌های عادی مهندسی یا مواردی که این پرامپت تعیین کرده، درخواست تأیید دوباره نکن. فقط ابهام واقعاً مسدودکننده یا اقدام خارج از اختیار را مطرح کن.

## ۳. محدوده دقیق این برش

پیاده‌سازی روی صفحه جزئیات PriceListVersion و مسیر تأیید همان نسخه انجام شود؛ یک بهبود عمودی کامل با backend، API، UI و تست.

داخل محدوده:

1. گزارش فقط‌خواندنی از مقایسه snapshot نسخه آماده بررسی با snapshot current همان Supplier و Organization.
2. نمایش خلاصه، جدول تغییرات چندبرچسبی، فیلتر و صفحه‌بندی با مبنای مشخص.
3. اتصال confirmation و expected_current_version_id تأیید به مبنای همان گزارش.
4. رفتار روشن نبود current، خطای دریافت، تغییر وضعیت، صفحه قدیمی و تصمیم هم‌زمان.
5. حفظ گزارش تاریخی، immutability، مجوزها و Audit فعلی.
6. Spec، ADR، تست، مستندات و سناریوی دمو.

خارج از این برش: تاریخ اعتبار تأمین‌کننده، staleبودن محتوای فایل، هشدار جهش قیمت با آستانه تازه، لیست جزئی، تومان، PDF/OCR/AI، جست‌وجوی عملیاتی، خروجی Excel، پیش‌فاکتور، قانون سود، نقش جدید، دعوت عضو، unapprove/rollback، تأیید چندمرحله‌ای و background job. گزارش جدید را در صفحه Import نیز توسعه نده مگر وابستگی ضروری همین جریان باشد و دلیل آن را مشخص کن.

این قابلیت نمی‌تواند تازه‌بودن قیمت بازار یا موجودی لحظه‌ای را تضمین کند؛ در copy محصول چنین ادعایی نکن.

## ۴. Spec-driven development و تصمیم معماری

قبل از تغییر رفتار برنامه:

- docs/specs/current-price-impact.md را با مسئله، هدف، non-goals، اصطلاحات، رفتار stateها، قرارداد API، مجوز، سازگاری هم‌زمان، acceptance criteria و مثال‌های Given/When/Then بنویس.
- ACهای دارای شناسه مانند CPI-01 تا CPI-12 تعریف کن و برای هرکدام تست و مسیر آزمون دستی مشخص کن.
- ADR تازه با شماره آزاد بعدی در docs/adr برای تفاوت historical baseline و current baseline، عمر گزارش عملیاتی و اتصال مبنا به approval ثبت کن. ADRهای پذیرفته‌شده قبلی را بازنویسی یا بی‌صدا تغییر نده. این قابلیت افزوده طبق همین درخواست مجاز است؛ تصمیم‌های لازم را مستند و اجرا کن.
- API و وضعیت‌ها را پیش از پیاده‌سازی مشخص کن؛ اگر طراحی پیشنهادی پایین را بهبود می‌دهی، دلیل، سازگاری و پوشش تست را در Spec ثبت کن و معیارهای رفتاری را حفظ کن.
- ابتدا regression رفتاری failing، سپس کوچک‌ترین پیاده‌سازی منسجم، سپس تست کامل را اجرا کن.
- جدول پیگیری AC → تست → نتیجه را در گزارش پایان ثبت کن؛ Spec باید با خروجی نهایی هماهنگ باشد.

## ۵. قواعد معنایی گزارش

- target همیشه snapshot تغییرناپذیر نسخه مورد بررسی است؛ XLSX دوباره parse نشود.
- baseline عملیاتی از current_price_list_versions همان Supplier/Organization گرفته شود؛ از get_latest یا previous_version_id به‌عنوان جایگزین آن استفاده نکن.
- baseline موجود باید APPROVED باشد. ناسازگاری داده را با fallback به نسخه دیگر پنهان نکن؛ خطای پایدار و امن بده و تأیید UI را مسدود کن.
- گزارش live فقط برای READY_FOR_REVIEW ارائه و نمایش داده شود. نسخه‌های APPROVED و REJECTED همان گزارش تاریخی و Audit موجود را نشان دهند؛ یک گزارش live را به‌عنوان شواهد تاریخی تصمیم معرفی نکن. تهیه گزارش ثابت زمان تصمیم قابلیت جداگانه آینده است.
- READY_FOR_REVIEW قدیمی می‌تواند گزارش فقط‌خواندنی ببیند، ولی latest-only بودن Approval حفظ شود و UI برای نسخه غیرlatest امکان تأیید فعال نکند. Backend همچنان مرجع مجوز و کنترل latest باشد.
- تأمین‌کننده غیرفعال طبق رفتار فعلی قابل مشاهده بماند و تأیید آن مسدود باشد؛ برای این فیچر سیاست تازه‌ای برای Reject اختراع نکن.
- اگر current وجود ندارد: وضعیت صریح NO_CURRENT، baseline=null، summary=null، items=[] و total=0؛ پیام «هنوز قیمت جاری تأییدشده‌ای وجود ندارد؛ این نسخه در صورت تأیید، اولین قیمت جاری خواهد شد.» نمایش بده. همه کالاها را به‌اشتباه added نسبت به نسخه ردشده یا تأییدنشده گزارش نکن. جدول کالاهای target موجود است و باید قابل بازبینی بماند.
- اگر baseline وجود دارد: وضعیت CURRENT_BASELINE، شناسه/شماره/زمان لازم baseline و target و تمام تغییرهای دامنه فعلی نمایش داده شوند.
- summary روی همه ردیف‌ها محاسبه شود، مستقل از فیلتر و pagination؛ total تعداد ردیف‌های پس از فیلتر و قبل از pagination باشد. UNCHANGED و metadata_only_changed معنای فعلی را حفظ کنند.
- match در همین Supplier بر اساس normalized product code باشد؛ leading zero، نشانه معنادار، integer IRR، Decimal درصد، pack-size و unit مستقل و multi-label حفظ شوند.
- ترتیب ردیف‌ها قطعی باشد؛ فیلتر جدید صفحه را به ابتدا برگرداند.
- GET هیچ نسخه، Audit Event، pointer یا تصمیمی نسازد و داده تاریخی را تغییر ندهد.

## ۶. API و سازگاری هم‌زمان

یک endpoint افزوده پیشنهادی:

    GET /api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/current-impact

از قراردادهای موجود استفاده کن، ولی report جدید DTO/schema روشن داشته باشد؛ endpointهای /changes و /imports/{id}/comparison معنای قبلی خود را حفظ کنند. response حداقل target، وضعیت baseline، baseline_version، summary، items، total، limit و offset داشته باشد. current-impact نباید created_version را با معنایی مصنوعی از payload تاریخی قرض بگیرد.

فیلتر change_type و limit/offset با حدود فعلی ۱ تا ۱۰۰ و offset غیرمنفی سازگار باشد. وضعیت is_latest یا eligibility معادل را از Backend در همین read سازگار ارائه کن تا UI نیاز نداشته باشد قاعده latest-only را از شماره نسخه‌ها اختراع کند؛ وضعیت فعال‌بودن Supplier نیز از مسیر معتبر موجود یا همین response دریافت شود. در OpenAPI نمونه current موجود، current ناموجود، اختلاف predecessor با current و خطای conflict اضافه کن. خطاهای جدید را با code پایدار، HTTP status و پیام فارسی در Spec و error mapping موجود ثبت کن.

خواندن candidate، review state، current pointer و snapshot مبنا باید در یک دید سازگار از دیتابیس انجام شود؛ ترکیب چند Repository call با Sessionهای مستقل تضمین این سازگاری نیست. یک read port کوچک برای نیاز واقعی گزارش یا روش منسجم با adapter فعلی انتخاب کن. در ADR مشخص کن consistency با transaction/isolation یا lock کوتاه چگونه تضمین می‌شود. read را به lock طولانی حین محاسبه/serialization تبدیل نکن و import/approval را بی‌دلیل معطل نکن.

برای pagination/refetch، baseline بازبینی‌شده نباید بی‌صدا عوض شود. قرارداد پیشنهادی pin مبنا:

- GET اول بدون pin، current را resolves و شناسه مبنا را برمی‌گرداند.
- درخواست‌های بعد با baseline_version_id=<UUID دیده‌شده> ارسال می‌شوند؛ اگر current دیگر آن نیست، 409 با code CURRENT_PRICE_VERSION_CHANGED بده، به‌جای آنکه صفحه بعد را با مبنای تازه برگردانی.
- برای pinکردن نبود current، expect_no_current=true استفاده شود؛ اگر current ایجاد شده، همان conflict. این گزینه با baseline_version_id هم‌زمان مجاز نباشد و ترکیب نامعتبر 422 بدهد.
- UUID pin مدرک authorization نیست. منابع متعلق به سازمان/تأمین‌کننده دیگر همان سیاست not-found امن موجود را داشته باشند و metadata آنها در پاسخ conflict لو نرود.

طراحی هم‌ارز ساده‌تر مجاز است، ولی pin مبنا، حالت null و جلوگیری از ترکیب صفحات از دو baseline باید واقعاً تست شوند. فعلاً token امضاشده، جدول review-session یا snapshot مشتق‌شده تازه لازم نیست.

تأیید:

- expected_current_version_id دقیقاً از baseline گزارش مشاهده‌شده گرفته شود؛ برای NO_CURRENT مقدار null.
- مقدار آن را درست قبل از ارسال با GET current دیگری یا cache تازه‌تر جایگزین نکن. در کد فعلی VersionApprovalPanel این مقدار از query مستقل current می‌آید؛ برای جریان جدید آن را به report بازبینی‌شده وصل کن.
- CAS، lock، latest-only، Supplier فعال، Import معتبر، OWNER+CSRF، terminalبودن تصمیم و ثبت اتمیک Audit/pointer در Backend حفظ شوند.
- در 409 گزارش/تصمیم، confirmation پاک و تأیید مسدود شود؛ وضعیت تازه، baseline تازه و گزارش تازه دریافت شوند و کاربر دوباره تأیید کند. mutation خودکار retry نشود.
- اگر target در این فاصله terminal یا غیرlatest شد، UI وضعیت واقعی را نشان دهد و confirmation قدیمی قابل استفاده نباشد.
- checkbox تأیید انسانی را با اثبات server-side مشاهده همه ردیف‌ها یکی ندان؛ این برش پروتکل اثبات مرور یا مجوز تازه برای API Approval نمی‌سازد.
- Reject همچنان دلیل و confirmation خودش را داشته باشد. خرابی گزارش مقایسه نباید یک شرط کسب‌وکاری تازه برای امکان رد ایجاد کند.

## ۷. معماری و فرانت‌اند

Modular Monolith و وابستگی رو به داخل حفظ شود. منطق comparison موجود reuse شود؛ الگوریتم دوم در React، router یا SQL نساز. Domain وابسته به SQLAlchemy، FastAPI، Pydantic، openpyxl یا UI نشود. DTO/use case در application، دسترسی SQL در infrastructure و تبدیل HTTP در presentation بمانند.

از service API، schema validation و hooks فعلی فرانت‌اند استفاده کن. fetch و organizationId در feature/React component وارد نشوند. query key شامل Supplier، target، baseline pin، فیلتر و صفحه باشد؛ پاکسازی نشست و cache isolation موجود حفظ شود. AbortSignal readها و invalidation هدفمند detail/history/current/impact/audit و conflict را تست کن. optimistic approval و retry mutation اضافه نکن.

روی صفحه /suppliers/{supplierId}/price-list-versions/{versionId}:

- بخش جدید «اثر این نسخه بر قیمت جاری» نزدیک پنل تصمیم و قابل مشاهده پیش از confirmation باشد.
- گزارش تاریخی با عنوان روشن «تغییرات نسبت به نسخه قبلی ثبت‌شده» حفظ شود.
- شماره مبنا و target در هر بخش مشخص باشند. اگر برابرند، توضیح کوتاه بده ولی گزارش‌ها را از نظر معنا یکی نکن.
- از جدول، summary، badge و فیلترهای موجود reuse کن؛ state و pagination دو گزارش مستقل باشند.
- pack-size و unit با هشدار مستقل باقی بمانند و قیمت‌ها برچسب ریال داشته باشند.
- loading، NO_CURRENT، فیلتر بدون نتیجه، success، validation-error، 401/403/404، 409 و server-error/503 رفتار قابل فهم داشته باشند.
- تأیید OWNER تا دریافت موفق گزارش یا وضعیت NO_CURRENT و confirmation جدید فعال نشود؛ هنگام تغییر مبنا، target، وضعیت یا خطای stale تأیید قبلی reset شود. فیلترکردن همان گزارش با همان مبنا به‌تنهایی تغییر مبنا نیست.
- از نمایش cache قبلی به‌عنوان گزارش جدید هنگام تغییر Supplier/target یا baseline جلوگیری کن. background refetch نباید confirmation را روی مبنای تعویض‌شده نگه دارد.
- OPERATOR هر دو گزارش را فقط‌خواندنی ببیند و دکمه تصمیم نداشته باشد.
- رابط فارسی RTL، accessible table، focus و keyboard، loading/error announcement و escaping متن untrusted رعایت شود.

بدون نیاز واقعی dependency تازه، schema persisted، migration یا abstraction عمومی اضافه نکن. اگر schema لازم شد، دلیل را در ADR ثبت، migration افزایشی بساز و upgrade/backfill را بدون از بین بردن تاریخچه آزمایش کن. اگر لازم نبود، صریحاً در گزارش بگو migration جدید لازم نشد.

## ۸. تست‌های الزامی

تست‌ها باید رفتار را ثابت کنند، نه فقط وجود JSX یا نام توابع را.

Backend unit و integration با PostgreSQL واقعی طبق setup موجود:

1. V1 current، V2 rejected، V3 ready: baseline گزارش جدید V1 و baseline /changes برابر V2؛ نتایج واقعاً متفاوت باشند.
2. latest/predecessor تأییدنشده هرگز جای current را نگیرد.
3. NO_CURRENT حتی با وجود نسخه‌های تاریخی ready/rejected؛ summary null و بدون added ساختگی.
4. target ناموجود، Supplier اشتباه، سازمان دیگر، بدون نشست و UUID pin خارج از scope؛ پاسخ امن و بدون نشت.
5. terminal target گزارش live نگیرد؛ UI به historical/audit بازگردد.
6. فیلتر و pagination، summary کل، ترتیب قطعی، leading-zero، multi-label، unit و pack-size مستقل.
7. GET بدون mutation در pointer/version/items/audit؛ snapshotها و گزارش تاریخی قبل/بعد یکسان بمانند.
8. current یا review state در خواندن هم‌زمان ترکیب ناسازگار نسازند؛ تست deterministic با synchronization معتبر بنویس، نه sleep تصادفی.
9. pin baseline و pin نبود current با تغییر وضعیت 409 بدهند؛ ترکیب پارامترهای نامعتبر 422.
10. CAS stale Approval، concurrent decisions، latest-only، role/CSRF و اتمیک بودن Audit/current حفظ شوند. race ممکن را با ترتیب معتبر state machine بساز؛ بعد از ثبت V3 نمی‌توان V2 قدیمی را طبق latest-only تأیید کرد.

Frontend schema/API/hooks/component:

- قراردادهای جدید، path/query صحیح، baseline pin، AbortSignal، keys و invalidation.
- هر دو مبنا در صفحه دیده شوند و جدول‌ها/فیلترهایشان مستقل باشند.
- payload approve از report baseline باشد، حتی وقتی query مستقل current مقدار جدیدتر دارد؛ این regression حیاتی است.
- checkbox پس از تغییر مبنا/target و 409 پاک شود؛ درخواست تأیید خودکار تکرار نشود.
- حالت loading/NO_CURRENT/empty/success/error/conflict، نسخه غیرlatest، Supplier غیرفعال، terminal و OPERATOR.
- رد نسخه با دلیل و confirmation مستقل کار کند و current را تغییر ندهد.
- متن فایل به‌صورت متن escape شود و جدول semantic و برچسب ریال صحیح باشد.

fixture پایه را حفظ کن و assertionها را تضعیف نکن: old_items=24، new_items=24، added=2، removed=2، price_changed=18، metadata_only_changed=2، unchanged=2 و pack-size change برای ACC-RJ45-CAT6-100.

قبل از پایان: focused tests، make test، make lint، scriptهای format/check و build تولیدی frontend طبق package موجود. موارد مربوط به schema/DB و تست storage واقعی را مطابق محیط اجرا کن؛ skipped یا unavailable را موفقیت معرفی نکن. توقف موقت محیط به معنی کامل‌شدن قابلیت نیست؛ محدودیت باقی‌مانده را دقیق گزارش کن.

## ۹. داده و سناریوی دمو برای بنیان‌گذار

یک مجموعه کوچک XLSX ساختگی و قابل بازتولید، در مسیر جدا مثل fixtures/demo/current-price-impact/ آماده کن. baseline fixtureهای قبلی را تغییر نده. schema با parser فعلی، واحد پول ریال، کدها به‌صورت string، بدون macro یا formula باشد. این داده‌ها fixture عمدی‌اند و مسیر و expected آن‌ها مستند شود.

پیشنهاد داده دقیق:

| نسخه | کد string | نام | واحد | تعداد بسته | قیمت ریال |
|---|---|---|---|---|---|
| V1 | 0001 | سوکت شبکه بسته‌ای | بسته | 100 | 100000 |
| V1 | SW-001 | سوئیچ آزمایشی | عدد | 1 | 200000 |
| V2 | 0001 | سوکت شبکه بسته‌ای | بسته | 100 | 120000 |
| V2 | SW-001 | سوئیچ آزمایشی | عدد | 1 | 200000 |
| V3 | 0001 | سوکت شبکه بسته‌ای | بسته | 50 | 120000 |
| V3 | CAM-001 | دوربین آزمایشی | عدد | 1 | 300000 |

سایر فیلدها برای کد مشترک ثابت باشند. V1→V3: added=1، removed=1، price_changed=1، metadata_only_changed=0، unchanged=0 و قیمت 0001 برابر +20% همراه PACK_SIZE_CHANGED. V2→V3: added=1، removed=1، price_changed=0، metadata_only_changed=1، unchanged=0 و PACK_SIZE_CHANGED. «ارزان/گران شدن هر عدد» را از مبلغ بسته بدون تعریف دامنه نتیجه‌گیری نکن.

دموی مرورگر در محیط محلی/تست و با Supplier جدا:

1. ورود OWNER و ایجاد تأمین‌کننده «تأمین‌کننده آزمایشی اثر قیمت» با نام یکتا برای اجرای تازه.
2. upload V1، ساخت Version با confirmation، نمایش NO_CURRENT و بررسی کالاها؛ تأیید V1 به‌عنوان اولین current.
3. upload V2، ساخت Version، مشاهده تغییر قیمت و رد با دلیل «این فایل تأیید نمی‌شود»؛ اثبات باقی‌ماندن V1 جاری.
4. upload V3 و ساخت Version؛ مشاهده historical baseline=V2 و current baseline=V1 و شمارش‌های متفاوت بالا.
5. نمایش فیلتر تغییر قیمت و تغییر بسته، leading-zero و پیام تأیید؛ تأیید V3.
6. refresh صفحه Supplier، مشاهده current=V3، حفظ V1 تاریخی و نمایش رویداد تصمیم.
7. مشاهده همان گزارش‌ها در نشست OPERATOR موجود/آزمون، بدون حق Approval/Reject. تا وقتی دعوت عضو وجود ندارد، برای demo عضو با endpoint عمومی جعلی نساز؛ از سازوکار آزمون/راهکار محلی مستند موجود بدون انتشار credential استفاده کن.
8. سناریوی stale معتبر: دو نشست OWNER، هر دو V3 آماده را باز کنند؛ یکی تأیید کند، دیگری با وضعیت قدیمی نتواند تصمیم دوم ثبت کند. اگر UI قبل از کلیک وضعیت را تازه و تصمیم را مسدود کرد، همان رفتار صحیح است. تغییر pointer در race لازم را با سناریوی integration سازگار با latest-only نیز ثابت کن.

داده دمو را از مسیر عادی API/UI وارد کن، نه با دستکاری pointer یا دورزدن validation. تکرار دمو با Supplier تازه از dedup فایل همان Supplier جلوگیری می‌کند. هیچ داده واقعی کاربر را پاک نکن و هیچ credential یا dump حساس در repo/گزارش ننویس.

برای آزمون دستی بنیان‌گذار، فایل docs/demos/current-price-impact-demo-fa.md با پیش‌نیاز، فرمان‌های واقعی اجرا، محل فایل‌ها، مسیر هر صفحه، اقدام هر مرحله و نتیجه دقیق مورد انتظار بنویس. خطای سرور و رفتار تلاش مجدد نیز روش آزمون داشته باشد. اگر مرورگر واقعی در دسترس است، happy path و failure/conflict را اجرا کن و شاهد قابل مشاهده ارائه بده؛ mock را end-to-end واقعی یا storage واقعی معرفی نکن. اگر در دسترس نیست، آن را در گزارش محدودیت اعلام کن.

## ۱۰. مستندات و خروجی پایان

docs/API.md و OpenAPI، docs/DOMAIN.md و docs/PRODUCT.md، اسناد معماری/تست و وضعیت roadmap/sprint مرتبط را به اندازه تغییر واقعی به‌روز کن. Spec و ADR و راهنمای دمو با کد نهایی هم‌خوان باشند. برای این برش نام مستقل «اثر بر قیمت جاری» استفاده کن؛ انجام کل Sprint جست‌وجو یا کل hardening را ادعا نکن.

گزارش نهایی فارسی و خودکفا شامل:

1. **نتیجه برای کاربر:** چه چیزی اضافه شد و چگونه ریسک تصمیم روی مبنای اشتباه کمتر می‌شود.
2. **توضیح فنی:** source داده، تفاوت دو baseline، port/use case/API/UI تغییرکرده، read consistency، pin/CAS و دلیل نیاز یا عدم نیاز به migration.
3. **مدارک Spec:** لینک Spec/ADR و جدول ACها و تست‌هایشان.
4. **نتیجه کنترل کیفیت:** فرمان‌های واقعاً اجراشده، passed/failed/skipped، build و محدودیت‌های محیط؛ اعداد از خروجی همین اجرا، نه گزارش‌های اسپرینت قبلی.
5. **دموی قدم‌به‌قدم:** فایل‌ها و لینک‌های صفحات محلی، مراحل V1/V2/V3 و نتایج عددی بالا، نقش OWNER/OPERATOR و stale scenario تا بنیان‌گذار بتواند خودش تکرار کند.
6. **محدودیت باقی‌مانده:** موارد تست‌نشده و این واقعیت که تأیید داخلی و مقایسه نسخه، اعتبار امروز قیمت تأمین‌کننده را اثبات نمی‌کند.

فایل‌ها را با لینک مسیر واقعی گزارش کن. secret، build output، cache، screenshot موقت یا داده شخصی وارد Git نشود. commit/push/PR یا deploy بدون درخواست مشخص این کار لازم نیست. به تهیه طرح بسنده نکن؛ همین برش را تا رفتار قابل اجرا و قابل بازبینی پیش ببر و اگر مانعی واقعاً باقی ماند، نتیجه ناقص را کامل معرفی نکن.
