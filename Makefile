.PHONY: bootstrap api-dev web-dev test test-api test-web lint format compose-up compose-down

bootstrap:
	cd apps/api && uv sync --dev
	pnpm install

api-dev:
	cd apps/api && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web-dev:
	pnpm --dir apps/web dev

test: test-api test-web

test-api:
	cd apps/api && uv run pytest

test-web:
	pnpm --dir apps/web test

lint:
	cd apps/api && uv run ruff check app tests
	cd apps/api && uv run mypy app
	pnpm --dir apps/web lint
	pnpm --dir apps/web typecheck
	pnpm --dir apps/web format:check

format:
	cd apps/api && uv run ruff format app tests
	cd apps/api && uv run ruff check --fix app tests
	pnpm --dir apps/web format

compose-up:
	docker compose up --build

compose-down:
	docker compose down
