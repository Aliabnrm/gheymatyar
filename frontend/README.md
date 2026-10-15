# فرانت‌اند قیمت‌یار

این بسته، داشبورد فارسی RTL قیمت‌یار را با Next.js App Router ارائه می‌کند. مسیرها فقط وظیفه ترکیب قابلیت‌ها را دارند و منطق مقایسه لیست قیمت داخل مرز feature نگهداری می‌شود.

## ساختار

```text
frontend/
├── components.json                   # پیکربندی source-owned shadcn و aliasها
├── src/
│   ├── app/                          # /، /login، /register، providerها و CSS
│   ├── components/
│   │   ├── ui/                       # primitiveهای shadcn بدون منطق feature
│   │   └── shared/                   # componentهای دارای چند مصرف واقعی
│   ├── config/                       # تنظیمات عمومی و type-safe برنامه
│   ├── core/
│   │   ├── api/                      # HTTP، CSRF و event مرکزی 401
│   │   └── query/                    # QueryClient و provider
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/           # shell و feedback نمایشی
│   │   │   ├── forms/                # Login و Register با RHF
│   │   │   ├── guards/               # bootstrap و محافظ UX مسیرها
│   │   │   ├── model/                # route و labelهای type-safe
│   │   │   └── index.ts              # public API قابلیت
│   │   ├── price-list-comparison/    # قابلیت مقایسه XLSX
│   │   ├── price-list-changes/       # نمایش مشترک تغییرات، بسته و اطلاعات کالا
│   │   ├── price-list-imports/       # آپلود، تاریخچه و بازبینی Import Draft
│   │   ├── price-list-versions/      # مقایسه Import، ثبت و تاریخچه نسخه‌ها
│   │   └── suppliers/                # list/create/detail/update تأمین‌کننده
│   ├── services/
│   │   ├── auth/                     # schema، API و TanStack hooks
│   │   ├── price-list-comparison/
│   │   ├── price-list-shared/        # قراردادهای مشترک کالا و تغییرات
│   │   ├── price-list-imports/       # schema، API و TanStack hooks مربوط به Import
│   │   ├── price-list-versions/      # schema، API و query/mutationهای نسخه
│   │   └── suppliers/
│   ├── lib/                          # utility استاندارد shadcn مانند cn
│   └── utils/                        # ابزارهای خالص برنامه
└── tests/
    ├── architecture/                 # Web Storage و dependency boundary
    ├── component/                    # رفتار قابل مشاهده componentها
    ├── fixtures/                     # داده مرجع مشترک تست
    ├── setup/                        # setup سراسری Vitest
    └── unit/                         # core، service، schema و مدل خالص
```

## قواعد وابستگی

- `app` قابلیت‌ها را از ورودی عمومی آن‌ها compose می‌کند.
- feature رابط کاربری می‌تواند از `services`، `core` و ابزارهای مشترک استفاده کند.
- مدل‌های خالص در `features/*/model`، هماهنگی سناریو در hookها و نمایش در
  componentها قرار می‌گیرد؛ جهت import با ESLint نیز کنترل می‌شود.
- `services` می‌تواند به `core` وابسته باشد، اما به componentها یا state رابط کاربری وابسته نیست.
- جهت وابستگی داخل هر service مشخص است: `hooks → api → schema/core`.
- `layout.tsx` یک Server Component باقی می‌ماند و فقط subtree برنامه را با Client Provider کوچک TanStack Query می‌پوشاند.
- هر سرویس با الگوی نام‌گذاری `<service>.schema.ts`، `<service>.api.ts` و `<service>.hooks.ts` ساخته می‌شود؛ component مستقیماً `fetch` اجرا نمی‌کند.
- ورودی و خروجی HTTP با Zod اعتبارسنجی می‌شوند و typeهای TypeScript با
  `z.input` و `z.output` از schema ساخته می‌شوند؛ بنابراین cast ناامن یا تعریف
  تکراری قرارداد نداریم.

## Design system و فرم‌ها

- shadcn یک dependency بسته نیست؛ primitiveهای انتخاب‌شده در `src/components/ui`
  بخشی از source پروژه‌اند و منطق Auth وارد آن‌ها نمی‌شود.
- primitive جدول Import در `components/ui/table.tsx` نیز source-owned و هم‌راستا
  با نسخه pinشده `shadcn@4.19.0` است و هیچ منطق قیمت یا Import ندارد.
- Tailwind 4 tokenهای semantic مانند `primary`، `destructive`، `border` و `ring`
  را به palette موجود قیمت‌یار در `globals.css` متصل می‌کند. CSS قدیمی قابلیت
  مقایسه هم‌زمان و بدون بازنویسی باقی مانده است.
- هر فرم Auth دقیقاً یک `useForm` و یک `zodResolver` دارد. تمام inputها از
  `ControlledInputField` عبور می‌کنند و همان component مالک `Controller` است؛
  `register()`، state دستی field و استخراج دستی `FormData` در Auth وجود ندارد.
- خطای field کنار control و خطای API در Alert مستقل و focusable نمایش داده می‌شود.
  loading، disabled، autocomplete، جهت LTR ایمیل و redirect ثابت نیز در مرز فرم
  مدیریت می‌شوند.
- component shared فقط وقتی در بیش از یک جریان مصرف واقعی دارد ساخته می‌شود؛
  componentهای guard و shell داخل مرز Auth باقی می‌مانند.

## دریافت داده و mutationها

- یک `QueryClient` برای عمر هر session مرورگر ساخته می‌شود و همه قابلیت‌ها از همان provider استفاده می‌کنند.
- queryهای خواندنی در آینده باید query key پایدار و schema پاسخ مختص feature داشته باشند.
- مقایسه دو فایل یک عملیات کاربرمحور است و با `useMutation` انجام می‌شود، نه `useQuery`.
- retry خودکار mutationها غیرفعال است تا آپلود فایل بدون اقدام صریح کاربر تکرار نشود.
- mutationهای فضای کاری از `useSessionMutation` استفاده می‌کنند؛ خروج یا تغییر
  نشست، نتیجه دیررس عملیات قبلی را از بازگرداندن داده به کش منع می‌کند.
- client مشترک فقط URL، شبکه، JSON، schema پاسخ و قرارداد خطای سراسری را مدیریت می‌کند؛ ساخت `FormData` در فایل API همان service باقی می‌ماند.
- خطای اعتبارسنجی محلی از state سرور جداست؛ بنابراین خطای فایل، نتیجه موفق قبلی را حذف نمی‌کند.

## جریان Auth

- `apiRequest` همیشه Cookieها را با `credentials: include` ارسال می‌کند و تمام
  پاسخ‌های موفق/خطا را با Zod کنترل می‌کند.
- فقط mutationهای session-authenticated مقدار `gheymatyar_csrf` را می‌خوانند و
  `X-CSRF-Token` می‌فرستند. Session Cookie HttpOnly و برای JavaScript غیرقابل خواندن است.
- `/auth/me` با query key پایدار bootstrap می‌شود. dashboard تا پایان bootstrap
  workspace یا داده حساس نشان نمی‌دهد.
- login/register پس از موفقیت cache حساب جاری را مقداردهی می‌کنند. logout یا 401
  cache auth و داده comparison را پاک و فقط به مسیر ثابت `/login` هدایت می‌کند.
- هیچ Auth state یا token در localStorage یا sessionStorage نگهداری نمی‌شود.
- redirectهای client فقط UX هستند؛ authorization واقعی در FastAPI و PostgreSQL است.

صفحات محافظت‌شده `/suppliers`، `/suppliers/new` و `/suppliers/[supplierId]` از
`ProtectedAppShell` مشترک استفاده می‌کنند. server state تأمین‌کننده با query-key
factory و schemaهای Zod مدیریت و هنگام logout یا 401 پاک می‌شود. فرم نام فقط از
React Hook Form، `Controller` و primitiveهای source-owned shadcn استفاده می‌کند.

مسیرهای `/suppliers/[supplierId]/imports/new` و
`/suppliers/[supplierId]/imports/[importId]` جریان آپلود و بازبینی Import را ارائه
می‌کنند. `FormData` فقط در API adapter ساخته می‌شود، mutation بارگذاری CSRF
می‌فرستد و GETهای تاریخچه، جزئیات و ردیف‌ها بدون CSRF اجرا می‌شوند. پاسخ‌های HTTP
پیش از ورود به UI با Zod به مدل camelCase تبدیل می‌شوند. cache این قابلیت بر اساس
Supplier و Import scope می‌شود و در logout، تغییر حساب و پاسخ 401 کامل پاک می‌شود.

فرم‌ها RTL، دارای label واقعی، autocomplete، validation محلی، loading/disabled،
`role=alert` و پیام‌های فارسی خطای credential، rate limit، registration disabled،
network و server هستند.

## تست‌ها

هیچ فایل test یا spec داخل `src` نگهداری نمی‌شود. تست‌ها بر اساس هدف در پوشه
ریشه `tests` تفکیک شده‌اند؛ تست component به markup داخلی shadcn وابسته نیست و با
role، label و accessible name رفتار کاربر را می‌سنجد. تست‌های architecture نیز
عدم استفاده Auth از Web Storage، عدم دسترسی JavaScript به Session Cookie و جهت
وابستگی feature/service را کنترل می‌کنند.

Vitest برای تست component و واحد از محیط DOM مشترک و setup متمرکز
`tests/setup/vitest.setup.ts` استفاده می‌کند. fixture حساب جاری فقط در
`tests/fixtures/auth.ts` تعریف می‌شود.

## نصب و اجرا

از ریشه مخزن:

```bash
pnpm install --frozen-lockfile
pnpm --dir frontend dev
```

افزودن primitive جدید shadcn باید از پوشه `frontend`، فقط پس از اثبات مصرف واقعی
و با فرمان نسخه‌دار `pnpm dlx shadcn@4.19.0 add <component>` انجام شود. primitive
جدید باید از tokenهای semantic موجود استفاده کند و dependency موازی UI وارد نکند.

## تایپوگرافی

رابط فارسی با فونت متغیر Vazirmatn به‌صورت local و از طریق `next/font/local` ارائه می‌شود. فایل فونت، اطلاعات نسخه، checksum و متن کامل مجوز SIL Open Font License 1.1 در `src/assets/fonts` نگهداری می‌شوند. هیچ درخواست runtime به CDN فونت ارسال نمی‌شود.

## قالب‌بندی یکدست

مرجع فرمت کد، `prettier.config.mjs` و نسخه دقیق Prettier در `package.json` است.
تورفتگی ۲ فاصله، طول خط پیشنهادی ۱۰۰ کاراکتر، double quote، semicolon،
trailing comma و پایان خط LF در کل فرانت یکسان‌اند. طول خط یک راهنماست، نه
محدودیت سخت برای رشته‌ها و نام‌های طولانی. JSX کوتاه فشرده می‌ماند و بخش‌های
طولانی خودکار چندخطی می‌شوند؛ شکست خط objectهای چندخطی حفظ می‌شود.

از ریشه مخزن، `pnpm --dir frontend format` فرمت را اعمال و
`pnpm --dir frontend format:check` فقط آن را کنترل می‌کند. این فرمان‌ها فایل‌های
قابل‌پشتیبانی فرانت، شامل source، تست‌ها، تنظیمات و README را پوشش می‌دهند؛
خروجی build، فایل‌های تولیدی Next، فونت‌های third-party و envها طبق
`.prettierignore` کنار گذاشته می‌شوند. کنترل فرمت از قبل در CI فعال است.

در ویرایشگر، افزونه Prettier را formatter پیش‌فرض فایل‌های فرانت قرار دهید و
Format on Save را فعال کنید؛ همان پیکربندی مخزن به‌صورت خودکار خوانده می‌شود.
Prettier مسئول ظاهر کد و ESLint مسئول کیفیت کد است؛ پیکربندی سازگاری Prettier
در انتهای قواعد ESLint از تداخل قواعد ظاهری جلوگیری می‌کند. مرتب‌سازی importها،
تغییر منطق یا حذف کد بخشی از قالب‌بندی نیست و خودکار انجام نمی‌شود.

## کنترل کیفیت

از پوشه `frontend` اجرا کنید:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

بخش نگاشت Import از serviceهای `column-mapping.schema/api/hooks` در همان قابلیت
استفاده می‌کند. validation نگاشت و eligibility ذخیره در مدل خالص و schema قرار
دارند؛ component مسئول نمایش و تعامل است. فیلدهای فنی نگاشت با نام‌های canonical
قرارداد HTTP نگه داشته می‌شوند. mutation اجرای جدید، cache تاریخچه، جزئیات، ردیف‌ها
و نگاشت همان Supplier را invalidate می‌کند و نتیجه تازه را در cache قرار می‌دهد.
ذخیره الگو عملیات جدا با تأیید جایگزینی است؛ همه خطاها، حالت خالی و loading فارسی‌اند.

## جریان نسخه‌های قیمت

service مستقل `price-list-versions` تمام پاسخ‌های Version و change report را با
Zod اعتبارسنجی و به مدل camelCase تبدیل می‌کند. query keyها Supplier-scoped هستند؛
GETها AbortSignal دارند و mutation ساخت نسخه retry خودکار ندارد. پس از موفقیت فقط
history، جزئیات Import و comparison همان Supplier تازه می‌شوند. conflict مبنا نیز
comparison همان Import را refresh می‌کند.

در صفحه Import، حالت اولین نسخه، summary، فیلتر، pagination، خطا و Supplier
غیرفعال نمایش داده می‌شود. اگر همان Import قبلاً Version ساخته باشد، پنل ساخت با
لینک نسخه موجود جایگزین می‌شود و گزارش همچنان مبنای تاریخی آن نسخه را نشان می‌دهد.
صفحه مستقل Version، metadata، تغییرات و کالاهای صفحه‌بندی‌شده را ارائه می‌کند.

## Review و قیمت جاری

service نسخه‌ها قراردادهای Review، Approval، Reject، Current و Audit را با Zod
اعتبارسنجی می‌کند. mutationها CSRF دارند، retry خودکار و optimistic update ندارند و
پس از success یا conflict، detail، history، current، audit و Supplier مربوط را تازه
می‌کنند. صفحه Version badge وضعیت، metadata تصمیم، پنل OWNER و timeline ممیزی دارد؛
OPERATOR حالت فقط‌خواندنی می‌بیند. صفحه Supplier نیز loading، empty، error و نسخه
جاری را در یک کارت ساده نمایش می‌دهد.

صفحه Version آماده بررسی، «تغییرات نسبت به نسخه قبلی ثبت‌شده» و «اثر این نسخه بر
قیمت جاری» را با state، فیلتر و pagination مستقل نشان می‌دهد. query گزارش جاری
شامل baseline pin است و Approval مقدار `expectedCurrentVersionId` را از همان گزارش
می‌گیرد، نه از query مستقل Current. `NO_CURRENT` پیام اولین قیمت جاری دارد؛ 409،
تعویض Target یا مبنا confirmation را باطل می‌کند. Reject مستقل از خرابی گزارش باقی
می‌ماند.

ریفکتور مسئولیت‌ها، اصلاحات رگرسیونی و روش بررسی دستی در
[گزارش ریفکتور](../docs/FRONTEND_REFACTOR_REPORT_FA.md) و تصمیم عمر کش نشست در
ADR 0012 مستند شده‌اند. ورودی‌های عمومی service نسخه‌ها حفظ شده‌اند؛ جزئیات
schema و query/mutation در فایل‌های داخلی جدا قرار دارند.
