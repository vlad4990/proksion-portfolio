.DEFAULT_GOAL := help

.PHONY: help install dev dev-front build type-check preview \
        up down restart ps logs logs-front clean clean-all

# Порты (можно переопределить через окружение или .env)
FRONT_DEV_PORT     ?= 5005
FRONT_PREVIEW_PORT ?= 4173

# ──────────────────────────────────────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────────────────────────────────────

help: ## Показать список команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# ──────────────────────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────────────────────

install: ## Установить зависимости фронта (front)
	cd front && npm install

# ──────────────────────────────────────────────────────────────────────────────
# Dev (локально)
# ──────────────────────────────────────────────────────────────────────────────

dev: dev-front ## Алиас на dev-front (back пока нет)

dev-front: ## Vite dev-сервер на FRONT_DEV_PORT (по умолчанию 5005, нужен для Chrome MCP)
	cd front && npm run dev -- --port $(FRONT_DEV_PORT) --host

# ──────────────────────────────────────────────────────────────────────────────
# Build & check
# ──────────────────────────────────────────────────────────────────────────────

build: ## Собрать прод-статику фронта → front/dist/ (tsc --noEmit + vite build)
	cd front && npm run build

type-check: ## TypeScript-проверка фронта без сборки (tsc --noEmit, strict)
	cd front && npx tsc --noEmit

preview: ## Отдать собранный front/dist/ локально (vite preview)
	cd front && npm run preview -- --port $(FRONT_PREVIEW_PORT) --host

# ──────────────────────────────────────────────────────────────────────────────
# Docker (прод-контейнеры монорепы)
# ──────────────────────────────────────────────────────────────────────────────

up: ## Поднять контейнеры (build + detached); front = Caddy со статикой на HTTP_PORT/HTTPS_PORT (80/443)
	@if [ ! -f .env ]; then cp .env.example .env && echo "[up] .env не найден — создан из .env.example"; fi
	docker compose up -d --build

down: ## Остановить контейнеры
	docker compose down

restart: ## Рестарт контейнеров
	docker compose restart

ps: ## Статус контейнеров
	docker compose ps

logs: ## Хвост логов всех сервисов
	docker compose logs -f

logs-front: ## Хвост логов front
	docker compose logs -f front

# ──────────────────────────────────────────────────────────────────────────────
# Cleanup
# ──────────────────────────────────────────────────────────────────────────────

clean: ## Удалить прод-сборку (front/dist)
	rm -rf front/dist

clean-all: clean ## clean + удалить node_modules фронта
	rm -rf front/node_modules
