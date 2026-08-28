# فرانت‌اند قیمت‌یار

این بسته، داشبورد فارسی RTL قیمت‌یار را با Next.js App Router ارائه می‌کند. مسیرها فقط وظیفه ترکیب قابلیت‌ها را دارند و منطق مقایسه لیست قیمت داخل مرز feature نگهداری می‌شود.

## ساختار

```text
src/
├── app/                              # route، metadata و CSS سراسری
├── config/                           # تنظیمات عمومی و type-safe برنامه
├── features/
│   └── price-list-comparison/
│       ├── components/               # UI و composition قابلیت
│       ├── hooks/                    # هماهنگی رفتار React و چرخه درخواست
│       ├── model/                    # انواع، فیلترها و state machine خالص
│       ├── services/                 # HTTP و اعتبارسنجی قرارداد پاسخ
│       ├── validation/               # قواعد فایل ورودی
│       └── index.ts                  # ورودی عمومی قابلیت
└── utils/                            # ابزارهای خالص و واقعاً مشترک
```

## قواعد وابستگی

- `app` قابلیت‌ها را از ورودی عمومی آن‌ها compose می‌کند.
- کد داخل feature می‌تواند از `config` و `utils` مشترک استفاده کند.
- ماژول‌های مشترک به feature وابسته نیستند.
- قراردادهای مختص مقایسه قیمت، حتی اگر TypeScript type باشند، داخل همان feature باقی می‌مانند.
- Server Component حالت پیش‌فرض است. مرز Client از `comparison-workspace.tsx` آغاز می‌شود چون انتخاب فایل و state مرورگر را مدیریت می‌کند.
- داده HTTP همیشه `unknown` فرض و پیش از ورود به model در runtime اعتبارسنجی می‌شود.

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
