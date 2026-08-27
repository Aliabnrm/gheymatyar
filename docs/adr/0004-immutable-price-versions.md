# ADR 0004: Immutable Approved Price Versions

- Status: Accepted
- Date: 2026-08-26

## Context

بازنویسی قیمت قبلی، ممیزی و تشخیص اعتبار پیش‌فاکتور را غیرممکن می‌کند.

## Decision

هر import تأییدشده یک version جدید می‌سازد. نسخه approved تغییر نمی‌کند. اصلاح بعدی version تازه است. اسناد فروش به version دقیق ارجاع می‌دهند.

## Consequences

- تاریخچه و audit قابل اعتماد است.
- حجم داده بیشتر می‌شود اما قابل مدیریت است.
- stale quote detection ممکن می‌شود.
