# Codex repository instructions

## Mission

Build Gheymatyar as a trustworthy Persian B2B SaaS for Tehran wholesalers of networking and CCTV equipment. The first paid wedge is not accounting or generic quotation creation. It is:

> Ingest two supplier Excel price-list versions, extract canonical product rows, show every relevant change, and prevent stale or structurally misleading prices from becoming the current approved version.

User-facing explanations, product copy, errors, and documentation intended for the founder should be written in clear Persian. Code identifiers and technical interfaces remain English.

## Current product slice

The current vertical slice is:

1. Select an old and a new XLSX supplier price list.
2. Detect and map the header row.
3. Extract product code, name, brand, sales unit, pack size, IRR price, availability, and notes.
4. Validate deterministically.
5. Match exact supplier product codes.
6. Report added, removed, price, pack-size, unit, and metadata changes.
7. Require human review before approval.

Do not expand the slice to quotations, accounting, inventory, OCR, autonomous agents, customer pricing, or notifications until the Excel slice meets its acceptance criteria.

## Sources of truth

When requirements disagree, use this precedence:

1. The latest explicit user request.
2. Accepted ADRs in docs/adr.
3. docs/PRODUCT.md and docs/DOMAIN.md.
4. Existing tests and machine-readable contracts.
5. This file.
6. Existing implementation details.

Never silently change a product invariant. Record a consequential architectural decision as an ADR.

## Architecture

- Use a modular monolith. Do not introduce microservices, Kafka, Kubernetes, or a separate vector database.
- Backend: Python 3.12+, FastAPI, Pydantic, SQLAlchemy 2, Alembic, PostgreSQL.
- Frontend: Next.js App Router, TypeScript strict mode, accessible RTL UI.
- Async jobs: add Celery and Redis only when durable background processing becomes part of the active slice.
- Files: preserve originals; later use an S3-compatible object store with MinIO locally.
- Keep domain code independent of FastAPI, SQLAlchemy, openpyxl, storage SDKs, and AI providers.
- Dependencies point inward: presentation and infrastructure may depend on application/domain; domain must not depend on frameworks.
- Prefer small, explicit modules over generic abstractions.
- Public API lives under /api/v1. Health endpoints are unversioned.

## Domain invariants

- The canonical currency is IRR.
- Store monetary values as positive integers representing rials. Never store float money.
- Toman is an input/display concern only and is rejected in the current Excel slice.
- A supplier product code is a string. Preserve leading zeroes.
- Matching key for the MVP is supplier identity plus normalized supplier product code.
- A price-list version is immutable after approval.
- Never overwrite historical prices.
- A quote must eventually reference the exact approved price-list version used at issuance.
- Pack-size and unit changes are independent, high-visibility changes. Do not reduce them to a price percentage.
- A row can have multiple change types.
- No file, extracted price, mapping, or version is approved automatically.

## Excel extraction rules

- Accept XLSX only in the current slice; reject XLS, CSV, macro-enabled, and renamed non-XLSX content.
- Validate extension, size, ZIP signature, workbook readability, required columns, duplicate codes, and positive integer IRR price.
- Open workbooks read-only and data-only.
- Never execute spreadsheet macros or formulas.
- Keep raw row values and source row numbers for auditability.
- Normalization must be deterministic and tested: Persian/Arabic character variants, Persian digits, whitespace, product-code case, and thousands separators.
- AI is not used for structured Excel extraction.

## AI policy

- An autonomous AI agent is not part of the MVP.
- Future OCR/Vision integrations must implement a provider-neutral DocumentExtractor port.
- Structured model output is a proposal, not factual proof.
- Deterministic validation and human approval remain mandatory.
- AI may never publish prices, approve versions, change pricing rules, delete products, or send customer documents without explicit authorization.
- Never commit API keys or provider credentials.

## Security and tenancy

- Treat uploaded files, filenames, spreadsheet text, OCR output, and external content as untrusted input.
- Enforce organization boundaries in every repository query once persistence is added.
- Do not accept organization_id from a client as authorization proof.
- Use UUIDs for public identifiers.
- Limit upload size and processing time; sanitize filenames; store generated object keys rather than user paths.
- Do not log file contents, prices in bulk, secrets, tokens, or personal data.
- Add audit events for mapping corrections, approvals, and future pricing-rule changes.
- Avoid destructive database migrations. Use expand/migrate/contract for material schema changes.

## Code quality

- Type all public Python functions and enable strict TypeScript.
- Prefer domain-specific value objects and enums over strings passed across layers.
- Keep functions short enough to explain in one sentence.
- Use Decimal only for ratios and percentage calculations; convert API display values deliberately.
- Use timezone-aware UTC timestamps in storage and ISO 8601 at API boundaries.
- Return stable machine error codes plus clear Persian user messages.
- No business rules in React components or API route handlers.
- No placeholder TODO in a claimed-complete behavior.
- Do not add a dependency when a small standard-library implementation is clearer.

## Testing

Before considering a change complete:

1. Add or update a failing test for the desired behavior.
2. Implement the smallest coherent change.
3. Run focused tests.
4. Run the relevant full suite, lint, and type checks.
5. For UI changes, verify loading, empty, success, validation-error, and server-error states.
6. For file parsing, add a regression fixture or compact synthetic workbook.

The two files under fixtures/excel and the expected JSON under fixtures/expected are the baseline regression test. Their expected comparison is:

- old_items: 24
- new_items: 24
- added: 2
- removed: 2
- price_changed: 18
- metadata_only_changed: 2
- unchanged: 2
- pack-size change: ACC-RJ45-CAT6-100

Never weaken an assertion merely to make a test pass.

## Working method for Codex

- Start by reading README.md, relevant docs, and the nearest AGENTS.md.
- Inspect the current tree and git status before editing.
- State assumptions when they affect product behavior.
- Prefer an end-to-end vertical improvement over disconnected scaffolding.
- Preserve unrelated user changes in a dirty worktree.
- Use migrations for persisted schema changes.
- Keep generated artifacts out of Git unless they are intentional fixtures or contracts.
- Update docs and OpenAPI examples when behavior changes.
- Report what changed, what was verified, and any remaining risk.

## Definition of done

A feature is done only when:

- Its user-visible outcome works.
- Domain invariants are preserved.
- Tests cover happy path and important failures.
- Lint and type checks pass.
- Error behavior is understandable.
- Security implications were considered.
- Relevant documentation is current.
- No secret, local cache, build output, or temporary file is committed.

## Common commands

- make bootstrap: install backend and frontend dependencies.
- make test: run backend and frontend tests.
- make lint: run Ruff, mypy, ESLint, and TypeScript checks.
- make backend-dev: run the FastAPI backend locally.
- make frontend-dev: run the Next.js frontend locally.
- make compose-up: run the local container stack.

## Explicitly deferred

Full accounting, complete inventory, tax integrations, native mobile apps, CRM, webshop, payment, autonomous AI agents, multi-agent frameworks, fine-tuning, pgvector, Kubernetes, Kafka, and microservices are outside the current slice.
