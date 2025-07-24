# Hanzo AI Chat - Unified Makefile
# Simple, clean commands for development and production

.PHONY: help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Default compose file
COMPOSE_FILE ?= compose.yml

# Default target
help:
	@echo "$(GREEN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║                  Hanzo AI Chat Platform                      ║$(NC)"
	@echo "$(GREEN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(BLUE)Quick Start:$(NC)"
	@echo "  $(GREEN)make up$(NC)              - Start chat with cloud API"
	@echo "  $(GREEN)make dev$(NC)             - Start in dev mode (hot reload)"
	@echo "  $(GREEN)make dev-full$(NC)        - Dev mode with local router"
	@echo ""
	@echo "$(BLUE)Core Commands:$(NC)"
	@echo "  $(GREEN)make down$(NC)            - Stop all services"
	@echo "  $(GREEN)make restart$(NC)         - Restart services"
	@echo "  $(GREEN)make logs$(NC)            - View logs"
	@echo "  $(GREEN)make status$(NC)          - Check service status"
	@echo "  $(GREEN)make clean$(NC)           - Stop and remove data"
	@echo ""
	@echo "$(BLUE)Development:$(NC)"
	@echo "  $(GREEN)make build$(NC)           - Build containers"
	@echo "  $(GREEN)make test$(NC)            - Run tests"
	@echo "  $(GREEN)make lint$(NC)            - Run linting"
	@echo "  $(GREEN)make format$(NC)          - Format code"
	@echo ""
	@echo "$(BLUE)Production:$(NC)"
	@echo "  $(GREEN)make prod$(NC)            - Deploy production"
	@echo "  $(GREEN)make backup$(NC)          - Backup data"
	@echo ""
	@echo "Run 'make help-all' for advanced usage"

help-all:
	@echo "$(GREEN)══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(GREEN)                    Advanced Usage                             $(NC)"
	@echo "$(GREEN)══════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(BLUE)Deployment Modes:$(NC)"
	@echo "  make up              - Basic: Chat + Cloud API"
	@echo "  make dev             - Development: Hot reload"
	@echo "  make dev-full        - Dev + Local router"
	@echo "  make prod            - Production with Traefik"
	@echo ""
	@echo "$(BLUE)Service Control:$(NC)"
	@echo "  make logs-chat       - View chat logs"
	@echo "  make logs-mongo      - View MongoDB logs"
	@echo "  make logs-router     - View router logs (dev-full)"
	@echo "  make shell-chat      - Shell into chat container"
	@echo "  make shell-mongo     - MongoDB shell"
	@echo ""
	@echo "$(BLUE)Development Tools:$(NC)"
	@echo "  make install         - Install dependencies"
	@echo "  make dev-frontend    - Run frontend only"
	@echo "  make dev-backend     - Run backend only"
	@echo "  make test-unit       - Unit tests"
	@echo "  make test-e2e        - E2E tests"
	@echo "  make lint-fix        - Auto-fix linting"
	@echo ""
	@echo "$(BLUE)Database:$(NC)"
	@echo "  make db-seed         - Seed demo data"
	@echo "  make db-reset        - Reset database"
	@echo "  make db-export       - Export data"
	@echo "  make db-import FILE= - Import data"
	@echo ""
	@echo "$(BLUE)Docker Compose Files:$(NC)"
	@echo "  compose.yml          - Base configuration"
	@echo "  compose.dev.yml      - Development overrides"
	@echo "  compose.prod.yml     - Production overrides"

# ============================================================================
# CORE COMMANDS
# ============================================================================

up:
	@echo "$(GREEN)Starting Hanzo Chat...$(NC)"
	@docker compose up -d
	@echo "$(GREEN)Chat available at http://localhost:3081$(NC)"

down:
	@echo "$(YELLOW)Stopping services...$(NC)"
	@docker compose down

restart: down up

logs:
	@docker compose logs -f

status:
	@echo "$(GREEN)Service Status:$(NC)"
	@docker compose ps
	@echo ""
	@echo "$(GREEN)Health Checks:$(NC)"
	@curl -s http://localhost:3081/api/health > /dev/null 2>&1 && echo "  ✓ Chat API" || echo "  ✗ Chat API"
	@curl -s http://localhost:3081 > /dev/null 2>&1 && echo "  ✓ Chat UI" || echo "  ✗ Chat UI"

clean:
	@echo "$(RED)Removing all data...$(NC)"
	@docker compose down -v

# ============================================================================
# DEVELOPMENT
# ============================================================================

dev:
	@echo "$(GREEN)Starting in development mode...$(NC)"
	@docker compose -f compose.yml -f compose.dev.yml up

dev-full:
	@echo "$(GREEN)Starting full dev stack with local router...$(NC)"
	@docker compose -f compose.yml -f compose.dev.yml --profile with-router up

build:
	@echo "$(GREEN)Building containers...$(NC)"
	@docker compose build

build-prod:
	@echo "$(GREEN)Building production image...$(NC)"
	@docker build -f docker/Dockerfile -t hanzoai/chat:latest .

# ============================================================================
# PRODUCTION
# ============================================================================

prod:
	@echo "$(GREEN)Deploying production...$(NC)"
	@test -n "$${JWT_SECRET}" || (echo "$(RED)JWT_SECRET required$(NC)" && exit 1)
	@test -n "$${OPENAI_API_KEY}" || (echo "$(RED)OPENAI_API_KEY required$(NC)" && exit 1)
	@docker compose -f compose.yml -f compose.prod.yml up -d

backup:
	@echo "$(GREEN)Creating backup...$(NC)"
	@mkdir -p backups
	@docker compose exec -T mongodb mongodump --out /backup
	@docker cp $$(docker compose ps -q mongodb):/backup backups/mongodb-$$(date +%Y%m%d-%H%M%S)
	@echo "$(GREEN)Backup complete$(NC)"

# ============================================================================
# LOGS
# ============================================================================

logs-chat:
	@docker compose logs -f chat

logs-mongo:
	@docker compose logs -f mongodb

logs-meili:
	@docker compose logs -f meilisearch

logs-router:
	@docker compose -f compose.yml -f compose.dev.yml logs -f router

# ============================================================================
# SHELL ACCESS
# ============================================================================

shell-chat:
	@docker compose exec chat sh

shell-mongo:
	@docker compose exec mongodb mongosh -u hanzo -p hanzo123 HanzoChat

# ============================================================================
# TESTING
# ============================================================================

test:
	@echo "$(GREEN)Running tests...$(NC)"
	@npm test

test-unit:
	@echo "$(GREEN)Running unit tests...$(NC)"
	@npm run test:unit

test-e2e:
	@echo "$(GREEN)Running E2E tests...$(NC)"
	@npm run test:e2e

# ============================================================================
# CODE QUALITY
# ============================================================================

lint:
	@echo "$(GREEN)Running linters...$(NC)"
	@npm run lint

lint-fix:
	@echo "$(GREEN)Auto-fixing lint issues...$(NC)"
	@npm run lint:fix

format:
	@echo "$(GREEN)Formatting code...$(NC)"
	@npm run format

# ============================================================================
# INSTALLATION
# ============================================================================

install:
	@echo "$(GREEN)Installing dependencies...$(NC)"
	@npm install
	@cd api && npm install
	@cd client && npm install

# ============================================================================
# DATABASE
# ============================================================================

db-seed:
	@echo "$(GREEN)Seeding database...$(NC)"
	@docker compose exec chat npm run seed

db-reset:
	@echo "$(RED)Resetting database...$(NC)"
	@docker compose exec mongodb mongosh -u hanzo -p hanzo123 HanzoChat --eval "db.dropDatabase()"
	@make db-seed

db-export:
	@echo "$(GREEN)Exporting database...$(NC)"
	@mkdir -p exports
	@docker compose exec -T mongodb mongoexport -u hanzo -p hanzo123 -d HanzoChat -c conversations > exports/conversations-$$(date +%Y%m%d).json

db-import:
	@test -n "$(FILE)" || (echo "$(RED)Please specify FILE=path/to/export.json$(NC)" && exit 1)
	@echo "$(GREEN)Importing $(FILE)...$(NC)"
	@docker compose exec -T mongodb mongoimport -u hanzo -p hanzo123 -d HanzoChat -c conversations < $(FILE)

# ============================================================================
# UTILITIES
# ============================================================================

env-example:
	@echo "$(GREEN)Creating example .env file...$(NC)"
	@cp .env.example .env
	@echo "$(YELLOW)Edit .env and add your API keys$(NC)"

check-env:
	@echo "$(GREEN)Environment Check:$(NC)"
	@test -f .env && echo "✓ .env file exists" || echo "✗ .env file missing"
	@which docker > /dev/null && echo "✓ Docker installed" || echo "✗ Docker not found"
	@docker compose version > /dev/null 2>&1 && echo "✓ Docker Compose v2" || echo "✗ Docker Compose v2 not found"

version:
	@echo "$(GREEN)Hanzo AI Chat$(NC)"
	@echo "Version: $$(cat package.json | grep version | head -1 | awk -F: '{ print $$2 }' | sed 's/[",]//g')"

.DEFAULT_GOAL := help