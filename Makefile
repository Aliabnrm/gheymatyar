.PHONY: bootstrap backend-dev frontend-dev test test-backend test-frontend lint format compose-up compose-down

bootstrap:
	cd backend && uv sync --dev
	pnpm install

backend-dev:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend-dev:
	pnpm --dir frontend dev

test: test-backend test-frontend

test-backend:
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

compose-up:
	docker compose up --build

compose-down:
	docker compose down
