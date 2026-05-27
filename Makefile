.DEFAULT_GOAL := help

.PHONY: help install up down restart ps logs logs-front logs-back \
        dev dev-front dev-back build type-check clean

# ──────────────────────────────────────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────────────────────────────────────

help: ## Показать список команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# ──────────────────────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────────────────────

install: ## Установить зависимости (front + back, если /back уже существует)
	cd front && npm install
	@if [ -d back ]; then cd back && bun install; else echo "[install] /back пока нет, пропускаю"; fi

# ──────────────────────────────────────────────────────────────────────────────
# Docker (production контейнеры)
# ──────────────────────────────────────────────────────────────────────────────

up: ## Поднять все контейнеры в docker (build + detached)
	docker compose up -d --build

down: ## Остановить контейнеры
	docker compose down

restart: ## Рестарт всех контейнеров
	docker compose restart

ps: ## Статус контейнеров
	docker compose ps

logs: ## Хвост логов всех сервисов
	docker compose logs -f

logs-front: ## Хвост логов front
	docker compose logs -f front

logs-back: ## Хвост логов back (появится когда /back будет в compose)
	docker compose logs -f back

# ──────────────────────────────────────────────────────────────────────────────
# Dev (локально, без docker)
# ──────────────────────────────────────────────────────────────────────────────

dev: ## Запустить весь dev-стек параллельно (front + back)
	@$(MAKE) -j2 dev-front dev-back

dev-front: ## Astro dev на FRONT_DEV_PORT (по умолчанию 5005)
	cd front && npm run dev -- --port $${FRONT_DEV_PORT:-5005} --host

dev-back: ## ElysiaJS dev (пропускается если /back ещё нет)
	@if [ -d back ]; then cd back && bun run dev; \
	else echo "[dev-back] /back пока нет, пропускаю"; fi

# ──────────────────────────────────────────────────────────────────────────────
# Build & check
# ──────────────────────────────────────────────────────────────────────────────

build: ## Собрать front (и back, если есть)
	cd front && npm run build
	@if [ -d back ]; then cd back && bun run build; else echo "[build] /back пока нет, пропускаю"; fi

type-check: ## TypeScript проверка front
	cd front && npm run type-check

# ──────────────────────────────────────────────────────────────────────────────
# Cleanup
# ──────────────────────────────────────────────────────────────────────────────

clean: ## docker compose down -v (удаляет volumes)
	docker compose down -v
