.PHONY: bootstrap backend-migrate backend-dev frontend-dev test test-backend test-frontend lint format compose-deps compose-up compose-down

bootstrap:
	cd backend && uv sync --dev
	pnpm install

backend-dev:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

backend-migrate:
	cd backend && uv run alembic upgrade head

frontend-dev:
	pnpm --dir frontend dev

test: test-backend test-frontend

test-backend: backend-migrate
	cd backend && uv run pytest

test-frontend:
	pnpm --dir frontend test

lint:
	cd backend && uv run ruff check app tests
	cd backend && uv run mypy app
	pnpm --dir frontend lint
	pnpm --dir frontend typecheck
	pnpm --dir frontend format:check

format:
	cd backend && uv run ruff format app tests
	cd backend && uv run ruff check --fix app tests
	pnpm --dir frontend format

compose-deps:
	docker compose up -d postgres minio
	docker compose run --rm minio-init

compose-up: compose-deps
	docker compose run --rm --build backend uv run --no-sync alembic upgrade head
	docker compose up --build backend frontend

compose-down:
	docker compose down
