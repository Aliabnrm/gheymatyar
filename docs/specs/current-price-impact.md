# Spec قابلیت «اثر نسخه جدید بر قیمت جاری»

وضعیت: Accepted for implementation  
تاریخ: ۱۴۰۵-۰۷-۲۲

## مسئله و هدف

گزارش تاریخی هر Version طبق ADR 0009 آن نسخه را با predecessor ثبت‌شده مقایسه
می‌کند. predecessor می‌تواند ردشده باشد؛ پس این گزارش لزوماً نشان نمی‌دهد تأیید
نسخه جدید چه اثری بر قیمت جاری واقعی Supplier دارد.

هدف این قابلیت، افزودن یک گزارش عملیاتی و فقط‌خواندنی برای Version دارای وضعیت
`READY_FOR_REVIEW` است که snapshot همان Version را با snapshot اشاره‌شده توسط
`current_price_list_versions` در همان Organization و Supplier مقایسه کند. گزارش
تاریخی موجود بدون تغییر باقی می‌ماند.

## اصطلاحات

- **Target**: Version تغییرناپذیری که کاربر در حال بررسی آن است.
- **Historical baseline**: predecessor ذخیره‌شده Target؛ مبنای endpoint `/changes`.
- **Current baseline**: Version تأییدشده‌ای که Current pointer هنگام خواندن گزارش
  به آن اشاره می‌کند.
- **Pinned baseline**: شناسه Current baseline یا انتظار صریح نبود Current که برای
  صفحه‌بندی و refetch بعدی به سرور بازگردانده می‌شود.
- **Live report**: گزارش لحظه‌ای اثر Target بر Current؛ مدرک تاریخی زمان تصمیم نیست.

## Non-goals

این برش قیمت بازار یا موجودی لحظه‌ای را تضمین نمی‌کند و شامل snapshot گزارش زمان
تصمیم، تاریخ اعتبار، آستانه جهش تازه، تومان، export، جست‌وجوی عملیاتی، پیش‌فاکتور،
rollback، نقش تازه، OCR/PDF/AI، job پس‌زمینه یا تغییر صفحه Import نیست.

## قواعد رفتاری

1. Target و هر دو مجموعه کالا فقط از snapshotهای PostgreSQL خوانده می‌شوند؛ XLSX
   دوباره parse نمی‌شود.
2. Current baseline فقط از `current_price_list_versions` می‌آید. latest و predecessor
   fallback نیستند.
3. گزارش فقط برای Target دارای `READY_FOR_REVIEW` ارائه می‌شود. Version terminal
   گزارش تاریخی و Audit موجود را نگه می‌دارد، اما live report دریافت نمی‌کند.
4. Target قدیمی READY گزارش را می‌بیند، ولی `is_latest=false` است و Approval همچنان
   در Backend و UI مسدود می‌ماند.
5. Current موجود باید Review با وضعیت `APPROVED` داشته باشد. ناسازگاری با
   `CURRENT_PRICE_VERSION_INVALID` و HTTP 409 گزارش و Approval UI را مسدود می‌کند.
6. نبود Current با `NO_CURRENT`، `baseline_version=null`، `summary=null`، `items=[]`
   و `total=0` نمایش داده می‌شود؛ کالاها به‌صورت added ساختگی محاسبه نمی‌شوند.
7. Current موجود با `CURRENT_BASELINE` و metadata مبنا/Target، summary کل و جدول
   تغییر چندبرچسبی نمایش داده می‌شود.
8. summary مستقل از filter/pagination روی کل comparison است. `total` تعداد نتیجه
   پس از filter و پیش از pagination است. ترتیب دامنه موجود قطعی می‌ماند.
9. GET هیچ Version، Review، Current pointer، Item یا Audit Event را تغییر نمی‌دهد.
10. Supplier غیرفعال قابل مشاهده است، اما Approval طبق قاعده فعلی مسدود می‌ماند.

## قرارداد API

    GET /api/v1/suppliers/{supplier_id}/price-list-versions/{version_id}/current-impact

Query:

- `change_type`: یکی از ChangeTypeهای فعلی؛ اختیاری.
- `limit`: عدد ۱ تا ۱۰۰؛ پیش‌فرض ۵۰.
- `offset`: عدد نامنفی؛ پیش‌فرض صفر.
- `baseline_version_id`: UUID مبنای Current دیده‌شده؛ اختیاری.
- `expect_no_current`: boolean؛ پیش‌فرض false.

`baseline_version_id` و `expect_no_current=true` هم‌زمان نامعتبرند و با
`CURRENT_PRICE_IMPACT_PIN_INVALID` و HTTP 422 رد می‌شوند.

Response موفق:

```json
{
  "target_version": { "id": "uuid", "version_number": 3, "created_at": "ISO-8601" },
  "baseline_status": "CURRENT_BASELINE",
  "baseline_version": { "id": "uuid", "version_number": 1, "created_at": "ISO-8601" },
  "is_latest": true,
  "supplier_is_active": true,
  "summary": {
    "old_items": 2,
    "new_items": 2,
    "added": 1,
    "removed": 1,
    "price_changed": 1,
    "metadata_only_changed": 0,
    "unchanged": 0
  },
  "items": [],
  "total": 3,
  "limit": 50,
  "offset": 0
}
```

`target_version` و `baseline_version` فقط metadata لازم گزارش را دارند و از
`created_version` گزارش تاریخی استفاده معنایی نمی‌کنند.

خطاهای پایدار:

| Code | HTTP | معنا |
| --- | ---: | --- |
| `PRICE_LIST_VERSION_NOT_FOUND` | 404 | Target/Supplier خارج از scope یا ناموجود |
| `PRICE_LIST_VERSION_NOT_READY_FOR_REVIEW` | 409 | Target terminal است |
| `CURRENT_PRICE_VERSION_CHANGED` | 409 | Current با pin دیده‌شده سازگار نیست |
| `CURRENT_PRICE_VERSION_INVALID` | 409 | Current به Version تأییدشده معتبر اشاره نمی‌کند |
| `CURRENT_PRICE_IMPACT_PIN_INVALID` | 422 | ترکیب pinها نامعتبر است |

UUID pin مدرک مجوز نیست. UUID خارج از tenant lookup جداگانه ندارد و metadata آن
در خطا بازگردانده نمی‌شود.

## سازگاری هم‌زمان

adapter گزارش metadata و Itemهای Target/Current را در یک transaction کوتاه
PostgreSQL با isolation برابر `REPEATABLE READ` و حالت `READ ONLY` می‌خواند. lock
طولانی گرفته نمی‌شود و محاسبه/serialization پس از پایان transaction روی snapshotهای
immutable انجام می‌شود.

در GET نخست بدون pin، Current resolve و شناسه آن برگردانده می‌شود. صفحه درخواست‌های
بعدی را با `baseline_version_id` یا `expect_no_current=true` می‌فرستد. تغییر Current
به‌جای ترکیب صفحات دو baseline با 409 متوقف می‌شود. Approval دقیقاً
`expected_current_version_id` همین گزارش دیده‌شده را ارسال می‌کند. در 409، UI
confirmation را پاک، گزارش/detail/current را refetch و تأیید دوباره را لازم می‌کند.

## مجوز و امنیت

- OWNER و OPERATOR دارای Session می‌توانند گزارش را بخوانند.
- فقط OWNER با CSRF می‌تواند approve/reject کند؛ این endpoint قاعده مجوز تازه‌ای
  برای mutation ایجاد نمی‌کند.
- همه queryها هم‌زمان با Organization و Supplier scope می‌شوند.
- متن spreadsheet با rendering متنی React نمایش داده می‌شود و وارد HTML خام نمی‌شود.
- گزارش محتوای انبوه قیمت را در log یا Audit ذخیره نمی‌کند.

## Acceptance criteria و مسیر اثبات

| AC | معیار | تست خودکار | آزمون دستی |
| --- | --- | --- | --- |
| CPI-01 | V3 historical با V2 و current-impact با V1 مقایسه شود | integration API | دموی V1/V2/V3 مرحله ۴ |
| CPI-02 | latest/predecessor غیرتأییدشده جای Current نشود | unit + integration | رد V2 و مشاهده مبنای V1 |
| CPI-03 | نبود Current نتیجه NO_CURRENT بدون added ساختگی دهد | integration + component | مرحله تأیید V1 پیش از تصمیم |
| CPI-04 | terminal Target live report نگیرد | integration + component | refresh V1/V2 terminal |
| CPI-05 | tenant، Supplier و UUID pin نشت ندهند | integration | نشست سازمان دیگر |
| CPI-06 | summary کل، filter، pagination و ترتیب قطعی بمانند | unit + integration | فیلتر قیمت/بسته V3 |
| CPI-07 | GET هیچ داده‌ای را تغییر ندهد | integration | refresh و مشاهده Audit ثابت |
| CPI-08 | read از یک snapshot دیتابیس سازگار باشد | repository integration | refetch هم‌زمان |
| CPI-09 | pin Current و نبود Current هنگام تغییر 409 بدهد | integration + hooks | دو نشست/تغییر Current |
| CPI-10 | Approval baseline گزارش را ارسال و stale confirmation را پاک کند | API/hooks/component | سناریوی stale |
| CPI-11 | OWNER/OPERATOR، inactive و latest-only حفظ شوند | integration + component | مشاهده OPERATOR |
| CPI-12 | دو گزارش با عنوان، baseline و state مستقل نمایش داده شوند | component | صفحه Version V3 |

## مثال‌های Given/When/Then

### تفاوت دو baseline

Given V1 تأییدشده و Current، V2 ردشده و V3 آماده بررسی است  
When صفحه V3 باز می‌شود  
Then گزارش تاریخی V3→V2 و گزارش اثر جاری V3→V1 را با شمارش‌های مستقل نشان می‌دهد.

### نبود Current

Given Versionهای تاریخی READY/REJECTED وجود دارند ولی Current وجود ندارد  
When current-impact خوانده می‌شود  
Then baseline از هیچ Version دیگری حدس زده نمی‌شود و پاسخ NO_CURRENT است.

### مبنای stale

Given کاربر صفحه‌ای pinned به V1 را باز کرده است  
When Current در transaction دیگری تغییر می‌کند و صفحه بعد/refetch درخواست می‌شود  
Then سرور `CURRENT_PRICE_VERSION_CHANGED` می‌دهد و UI confirmation را پاک می‌کند.

### Approval

Given گزارش موفق Target را نسبت به V1 نشان داده و کاربر confirmation را زده است  
When OWNER Approve را ارسال می‌کند  
Then payload دارای `expected_current_version_id=V1` است؛ query مستقل تازه‌تر آن را
جایگزین نمی‌کند و Backend همچنان CAS/latest/lock/Review/Audit را اعمال می‌کند.
