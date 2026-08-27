# ADR 0003: Controlled AI Extraction

- Status: Accepted
- Date: 2026-08-26

## Context

PDF و تصویر ممکن است برای استخراج به OCR یا Vision نیاز داشته باشند، اما قیمت داده پرریسک است و خروجی مدل می‌تواند اشتباه باشد.

## Decision

AI در Excel استفاده نمی‌شود. در ورودی‌های تصویری آینده، مدل فقط یک implementation از DocumentExtractor است و خروجی schema-bound پیشنهادی تولید می‌کند. validation قطعی و human approval الزامی است.

## Consequences

- provider قابل تعویض است.
- local OCR fallback ممکن است.
- autonomous approval و price publishing وجود ندارد.
- برای ارزیابی، دقت هر فیلد جدا سنجیده می‌شود.
