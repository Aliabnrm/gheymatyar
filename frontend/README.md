# فرانت‌اند قیمت‌یار

این بسته، داشبورد فارسی RTL قیمت‌یار را با Next.js App Router ارائه می‌کند. مسیرها فقط وظیفه ترکیب قابلیت‌ها را دارند و منطق مقایسه لیست قیمت داخل مرز feature نگهداری می‌شود.

## ساختار

```text
src/
├── app/                              # route، metadata، providerها و CSS سراسری
├── config/                           # تنظیمات عمومی و type-safe برنامه
├── core/
│   ├── api/                          # HTTP client، خطا و schema مشترک API
│   └── query/                        # QueryClient و TanStack Query provider
├── features/
│   └── price-list-comparison/
│       ├── components/               # UI و composition قابلیت
│       ├── hooks/                    # هماهنگی state رابط کاربری
│       ├── model/                    # فیلترها و انواع مختص UI
│       ├── validation/               # قواعد فایل ورودی
│       └── index.ts                  # ورودی عمومی قابلیت
├── services/
│   └── price-list-comparison/
│       ├── price-list-comparison.schema.ts # قرارداد Zod و typeهای API
│       ├── price-list-comparison.api.ts    # ساخت request و فراخوانی API
│       └── price-list-comparison.hooks.ts  # اتصال API به TanStack Query
└── utils/                            # ابزارهای خالص و واقعاً مشترک
```

## قواعد وابستگی

- `app` قابلیت‌ها را از ورودی عمومی آن‌ها compose می‌کند.
- feature رابط کاربری می‌تواند از `services`، `core` و ابزارهای مشترک استفاده کند.
- `services` می‌تواند به `core` وابسته باشد، اما به componentها یا state رابط کاربری وابسته نیست.
- جهت وابستگی داخل هر service مشخص است: `hooks → api → schema/core`.
- `layout.tsx` یک Server Component باقی می‌ماند و فقط subtree برنامه را با Client Provider کوچک TanStack Query می‌پوشاند.
- هر سرویس با الگوی نام‌گذاری `<service>.schema.ts`، `<service>.api.ts` و `<service>.hooks.ts` ساخته می‌شود؛ component مستقیماً `fetch` اجرا نمی‌کند.
- ورودی و خروجی HTTP با Zod اعتبارسنجی می‌شوند و typeهای TypeScript با `z.infer` از schema ساخته می‌شوند؛ بنابراین cast ناامن یا تعریف تکراری interface نداریم.

## دریافت داده و mutationها

- یک `QueryClient` برای عمر هر session مرورگر ساخته می‌شود و همه قابلیت‌ها از همان provider استفاده می‌کنند.
- queryهای خواندنی در آینده باید query key پایدار و schema پاسخ مختص feature داشته باشند.
- مقایسه دو فایل یک عملیات کاربرمحور است و با `useMutation` انجام می‌شود، نه `useQuery`.
- retry خودکار mutationها غیرفعال است تا آپلود فایل بدون اقدام صریح کاربر تکرار نشود.
- client مشترک فقط URL، شبکه، JSON، schema پاسخ و قرارداد خطای سراسری را مدیریت می‌کند؛ ساخت `FormData` در فایل API همان service باقی می‌ماند.
- خطای اعتبارسنجی محلی از state سرور جداست؛ بنابراین خطای فایل، نتیجه موفق قبلی را حذف نمی‌کند.

## تایپوگرافی

رابط فارسی با فونت متغیر Vazirmatn به‌صورت local و از طریق `next/font/local` ارائه می‌شود. فایل فونت، اطلاعات نسخه، checksum و متن کامل مجوز SIL Open Font License 1.1 در `src/assets/fonts` نگهداری می‌شوند. هیچ درخواست runtime به CDN فونت ارسال نمی‌شود.

## کنترل کیفیت

از پوشه `frontend` اجرا کنید:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
