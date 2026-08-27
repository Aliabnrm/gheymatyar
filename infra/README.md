# زیرساخت محلی

Docker Compose پنج سرویس دارد:

- web: داشبورد Next.js روی پورت 3000
- api: FastAPI روی پورت 8000
- postgres: منبع داده مرحله persistence
- redis: صف durable آینده
- minio: نگهداری فایل اصلی آینده و کنسول روی پورت 9001

در برش فعلی API مقایسه stateless است و از PostgreSQL، Redis و MinIO استفاده نمی‌کند. وجود این سرویس‌ها آماده‌سازی مرحله بعد است و نباید باعث ورود dependency زیرساخت به domain شود.

رمزهای Compose فقط برای توسعه محلی هستند. از این مقادیر در محیط واقعی استفاده نشود.
