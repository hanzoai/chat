# Chat Makefile for Local Development
# Unified interface to Agents, LLMs, MCPs and any AI model or OpenAPI documented API with full RAG stack
# ========================================================================================================

# Default target - show help
.DEFAULT_GOAL := help

# Variables
DOCKER_COMPOSE := docker compose
NPM := npm

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color
BLUE := \033[0;34m

# Help command - displays all available commands
help: ## Show this help message
	@echo "$(GREEN)"
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║                        CHAT COMMANDS                         ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@echo "$(NC)"
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  $(GREEN)make start$(NC)          - Start Chat (vendor mode)"
	@echo "  $(GREEN)make vendor$(NC)         - Show vendor configuration"
	@echo "  $(GREEN)make dev$(NC)            - Start in development mode (local Node.js)"
	@echo "  $(GREEN)make stop$(NC)           - Stop all services"
	@echo ""
	@echo "$(YELLOW)Docker Commands:$(NC)"
	@echo "  $(GREEN)make up$(NC)             - Start Docker services in background"
	@echo "  $(GREEN)make down$(NC)           - Stop and remove Docker containers"
	@echo "  $(GREEN)make restart$(NC)        - Restart all Docker services"
	@echo "  $(GREEN)make logs$(NC)           - Show Docker logs (all services)"
	@echo "  $(GREEN)make logs-api$(NC)       - Show API logs only"
	@echo "  $(GREEN)make ps$(NC)             - Show running containers"
	@echo "  $(GREEN)make build$(NC)          - Build Docker images"
	@echo ""
	@echo "$(YELLOW)Development Commands:$(NC)"
	@echo "  $(GREEN)make install$(NC)        - Install all dependencies"
	@echo "  $(GREEN)make install-force$(NC)  - Clean install (remove node_modules)"
	@echo "  $(GREEN)make build-packages$(NC) - Build all packages"
	@echo "  $(GREEN)make dev-backend$(NC)    - Start backend in dev mode"
	@echo "  $(GREEN)make dev-frontend$(NC)   - Start frontend in dev mode"
	@echo "  $(GREEN)make lint$(NC)           - Run linter"
	@echo "  $(GREEN)make format$(NC)         - Format code with Prettier"
	@echo ""
	@echo "$(YELLOW)Database Commands:$(NC)"
	@echo "  $(GREEN)make db-shell$(NC)       - Access MongoDB shell"
	@echo "  $(GREEN)make db-backup$(NC)      - Backup MongoDB database"
	@echo "  $(GREEN)make db-restore$(NC)     - Restore MongoDB database"
	@echo ""
	@echo "$(YELLOW)Utility Commands:$(NC)"
	@echo "  $(GREEN)make clean$(NC)          - Clean build artifacts and logs"
	@echo "  $(GREEN)make clean-all$(NC)      - Clean everything (including node_modules)"
	@echo "  $(GREEN)make status$(NC)         - Show service status"
	@echo "  $(GREEN)make test$(NC)           - Run tests"
	@echo "  $(GREEN)make shell$(NC)          - Access API container shell"
	@echo "  $(GREEN)make update-branding$(NC) - Update logo in running container"
	@echo "  $(GREEN)make init-fixtures$(NC)  - Create demo user (dev only)"
	@echo ""
	@echo "$(YELLOW)Docker Registry Commands:$(NC)"
	@echo "  $(GREEN)make publish-login$(NC)  - Show GitHub Container Registry login instructions"
	@echo "  $(GREEN)make publish$(NC)        - Build and publish images (latest, stable tags)"
	@echo ""
	@echo "$(BLUE)Access the application at: http://localhost:3080$(NC)"
	@echo ""

# Quick start with banner (vendor mode by default)
start: ## Start Chat in vendor mode
	@echo "$(GREEN)"
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║                     Starting Chat...                         ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@echo "$(NC)"
	@$(MAKE) setup-vendor-env
	@$(MAKE) check-docker
	@$(MAKE) up
	@echo ""
	@echo "$(GREEN)✓ Chat started successfully!$(NC)"
	@echo ""
	@echo "$(YELLOW)Vendor Mode Configuration:$(NC)"
	@echo "  • Name:        $(BLUE)Hanzo AI$(NC)"
	@echo "  • Models:      $(BLUE)Hanzo Zen-1, Hanzo Zen-1 Pro$(NC)"
	@echo "  • Backend:     $(BLUE)Anthropic Claude$(NC)"
	@echo ""
	@echo "$(YELLOW)Access points:$(NC)"
	@echo "  • Application: $(BLUE)http://localhost:3080$(NC)"
	@echo "  • API Health:  $(BLUE)http://localhost:3080/api/health$(NC)"
	@echo ""
	@echo "$(GREEN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║                 🔐 Login with Demo Account                   ║$(NC)"
	@echo "$(GREEN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "  $(YELLOW)Email:$(NC)    $(BLUE)wow@this.com$(NC)"
	@echo "  $(YELLOW)Password:$(NC) $(BLUE)demo1234$(NC)"
	@echo ""
	@echo "$(YELLOW)Useful commands:$(NC)"
	@echo "  • View logs:      $(GREEN)make logs$(NC)"
	@echo "  • Stop:           $(GREEN)make stop$(NC)"
	@echo "  • Status:         $(GREEN)make status$(NC)"
	@echo ""

# Show vendor configuration
vendor: ## Show current vendor configuration
	@echo "$(GREEN)"
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║                     Vendor Mode                              ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@echo "$(NC)"
	@if [ -f .env ] && grep -q "VENDOR_MODE=true" .env; then \
		echo "$(YELLOW)Current Configuration:$(NC)"; \
		echo ""; \
		grep "^VENDOR_" .env | while read line; do \
			echo "  • $$line"; \
		done; \
		echo ""; \
		echo "$(GREEN)✓ Vendor mode is ENABLED$(NC)"; \
	else \
		echo "$(RED)✗ Vendor mode is DISABLED$(NC)"; \
		echo ""; \
		echo "Run '$(GREEN)make start$(NC)' to enable vendor mode"; \
	fi

# Docker commands
up: ## Start Docker services in background
	@$(DOCKER_COMPOSE) up -d
	@sleep 2
	@$(DOCKER_COMPOSE) exec api node config/create-user.js wow@this.com "Demo User" wow demo1234 --email-verified=true >/dev/null 2>&1 || true
	@echo ""
	@echo "$(GREEN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║                    Services Started                          ║$(NC)"
	@echo "$(GREEN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)🚀 Chat Services:$(NC)"
	@echo "  $(BLUE)Main Application$(NC)     → http://localhost:3080"
	@echo "  $(BLUE)API Health Check$(NC)     → http://localhost:3080/api/health"
	@echo ""
	@echo "$(YELLOW)📊 Supporting Services:$(NC)"
	@echo "  $(BLUE)MongoDB$(NC)              → localhost:27017 (database: chat)"
	@echo "  $(BLUE)Meilisearch$(NC)          → localhost:7700 (search engine)"
	@echo "  $(BLUE)PostgreSQL/pgvector$(NC)  → localhost:5432 (vector storage)"
	@echo "  $(BLUE)RAG API$(NC)              → localhost:8000 (document processing)"
	@echo ""
	@echo "$(YELLOW)🔧 Management Commands:$(NC)"
	@echo "  $(GREEN)make logs$(NC)            → View all service logs"
	@echo "  $(GREEN)make logs-api$(NC)        → View chat API logs only"
	@echo "  $(GREEN)make ps$(NC)              → Show container status"
	@echo "  $(GREEN)make shell$(NC)           → Access container shell"
	@echo "  $(GREEN)make stop$(NC)            → Stop all services"
	@echo ""
	@echo "$(GREEN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║                 🔐 Login with Demo Account                   ║$(NC)"
	@echo "$(GREEN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "  $(YELLOW)Email:$(NC)    $(BLUE)wow@this.com$(NC)"
	@echo "  $(YELLOW)Password:$(NC) $(BLUE)demo1234$(NC)"
	@echo ""
	@echo "$(YELLOW)💡 Tips:$(NC)"
	@echo "  • Create new account with 'Sign up' if needed"
	@echo "  • MCP tools available for file operations"
	@echo "  • Upload documents for RAG processing"
	@echo ""

down: ## Stop and remove Docker containers
	@$(DOCKER_COMPOSE) down

stop: ## Stop all services
	@$(DOCKER_COMPOSE) stop

restart: ## Restart all Docker services
	@$(DOCKER_COMPOSE) restart

logs: ## Show Docker logs (all services)
	@$(DOCKER_COMPOSE) logs -f

logs-api: ## Show API logs only
	@$(DOCKER_COMPOSE) logs -f api

ps: ## Show running containers
	@$(DOCKER_COMPOSE) ps

build: ## Build Docker images
	@$(DOCKER_COMPOSE) build

# Development commands
dev: ## Start in development mode (local Node.js)
	@echo "$(YELLOW)Starting development servers...$(NC)"
	@$(MAKE) check-containers
	@$(MAKE) install
	@$(MAKE) build-packages
	@echo "$(GREEN)Starting backend and frontend...$(NC)"
	@(trap 'kill 0' SIGINT; \
		MONGO_URI=mongodb://localhost:27017/chat $(NPM) run backend:dev & \
		$(NPM) run frontend:dev & \
		wait)

install: ## Install all dependencies
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	@$(NPM) install
	@cd api && $(NPM) install
	@cd client && $(NPM) install
	@cd packages/data-provider && $(NPM) install
	@cd packages/data-schemas && $(NPM) install
	@cd packages/api && $(NPM) install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

install-force: ## Clean install (remove node_modules)
	@echo "$(YELLOW)Performing clean install...$(NC)"
	@$(MAKE) clean-all
	@$(MAKE) install

build-packages: ## Build all packages
	@echo "$(YELLOW)Building packages...$(NC)"
	@$(NPM) run build:data-provider
	@$(NPM) run build:data-schemas
	@$(NPM) run build:api
	@echo "$(GREEN)✓ Packages built$(NC)"

dev-backend: ## Start backend in dev mode
	@$(NPM) run backend:dev

dev-frontend: ## Start frontend in dev mode
	@$(NPM) run frontend:dev

lint: ## Run linter
	@$(NPM) run lint

format: ## Format code with Prettier
	@$(NPM) run format

# Database commands
db-shell: ## Access MongoDB shell
	@$(DOCKER_COMPOSE) exec mongodb mongosh chat

db-backup: ## Backup MongoDB database
	@mkdir -p ./backups
	@$(DOCKER_COMPOSE) exec mongodb mongodump --db chat --out /dump
	@$(DOCKER_COMPOSE) cp mongodb:/dump ./backups/chat-backup-$$(date +%Y%m%d-%H%M%S)
	@echo "$(GREEN)✓ Database backed up$(NC)"

db-restore: ## Restore MongoDB database from latest backup
	@echo "$(YELLOW)Restoring from latest backup...$(NC)"
	@LATEST_BACKUP=$$(ls -t ./backups | head -1); \
	$(DOCKER_COMPOSE) cp ./backups/$$LATEST_BACKUP mongodb:/restore && \
	$(DOCKER_COMPOSE) exec mongodb mongorestore --db chat /restore/chat
	@echo "$(GREEN)✓ Database restored$(NC)"

# Utility commands
update-branding: ## Update branding in running container
	@echo "$(YELLOW)Updating branding...$(NC)"
	@docker exec chat cp /app/client/public/assets/logo.svg /app/client/dist/assets/logo.svg 2>/dev/null || true
	@echo "$(GREEN)✓ Branding updated. Clear browser cache to see changes.$(NC)"

clean: ## Clean build artifacts and logs
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -rf api/dist client/dist packages/*/dist
	@rm -rf logs/*.log
	@rm -rf backend.log frontend.log mongod.log
	@echo "$(GREEN)✓ Clean complete$(NC)"

clean-all: clean ## Clean everything (including node_modules)
	@echo "$(YELLOW)Removing node_modules...$(NC)"
	@rm -rf node_modules api/node_modules client/node_modules packages/*/node_modules
	@echo "$(GREEN)✓ Deep clean complete$(NC)"

status: ## Show service status
	@echo ""
	@echo "$(GREEN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║                    Service Status                            ║$(NC)"
	@echo "$(GREEN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)🐳 Docker Containers:$(NC)"
	@$(DOCKER_COMPOSE) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" | tail -n +2 | \
		awk -F'\t' '{printf "  %-20s %-25s %s\n", $$1, $$2, $$3}'
	@echo ""
	@echo "$(YELLOW)🌐 Service Health:$(NC)"
	@curl -s http://localhost:3080/api/health >/dev/null 2>&1 && \
		echo "  $(GREEN)✓ Chat API$(NC)            → http://localhost:3080 (healthy)" || \
		echo "  $(RED)✗ Chat API$(NC)            → http://localhost:3080 (not responding)"
	@curl -s http://localhost:8000/health >/dev/null 2>&1 && \
		echo "  $(GREEN)✓ RAG API$(NC)             → http://localhost:8000 (healthy)" || \
		echo "  $(RED)✗ RAG API$(NC)             → http://localhost:8000 (not responding)"
	@docker exec chat-mongodb mongosh --quiet --eval "db.runCommand({ping: 1})" >/dev/null 2>&1 && \
		echo "  $(GREEN)✓ MongoDB$(NC)             → localhost:27017 (connected)" || \
		echo "  $(RED)✗ MongoDB$(NC)             → localhost:27017 (not connected)"
	@curl -s http://localhost:7700/health >/dev/null 2>&1 && \
		echo "  $(GREEN)✓ Meilisearch$(NC)         → localhost:7700 (healthy)" || \
		echo "  $(YELLOW)- Meilisearch$(NC)         → localhost:7700 (internal only)"
	@docker exec vectordb pg_isready >/dev/null 2>&1 && \
		echo "  $(GREEN)✓ PostgreSQL/pgvector$(NC) → localhost:5432 (ready)" || \
		echo "  $(YELLOW)- PostgreSQL/pgvector$(NC) → localhost:5432 (internal only)"
	@echo ""
	@echo "$(YELLOW)📋 Quick Actions:$(NC)"
	@echo "  • View logs:    $(GREEN)make logs$(NC)"
	@echo "  • Restart:      $(GREEN)make restart$(NC)"
	@echo "  • Stop:         $(GREEN)make stop$(NC)"
	@echo ""

test: ## Run tests
	@$(NPM) run test:api
	@$(NPM) run test:client

shell: ## Access API container shell
	@$(DOCKER_COMPOSE) exec api /bin/sh

init-fixtures: ## Create demo user (dev only)
	@echo "$(YELLOW)Creating demo user...$(NC)"
	@$(DOCKER_COMPOSE) exec api node config/create-user.js wow@this.com "Demo User" wow demo1234 --email-verified=true || echo "$(RED)Failed to create demo user. Make sure services are running.$(NC)"
	@echo ""
	@echo "$(GREEN)Demo user credentials:$(NC)"
	@echo "  Email: $(BLUE)wow@this.com$(NC)"
	@echo "  Password: $(BLUE)demo1234$(NC)"

# Check if Docker/Colima is running
check-docker:
	@echo "$(YELLOW)Checking Docker status...$(NC)"
	@docker info >/dev/null 2>&1 || (echo "$(RED)Docker is not running. Please start Docker/Colima first.$(NC)" && exit 1)
	@echo "$(GREEN)✓ Docker is running$(NC)"

# Check if required containers are running
check-containers:
	@echo "$(YELLOW)Checking required containers...$(NC)"
	@if ! docker ps | grep -q "chat-mongodb"; then \
		echo "$(YELLOW)Starting MongoDB...$(NC)"; \
		docker run -d --name chat-mongodb -p 27017:27017 mongo || true; \
	fi
	@if ! docker ps | grep -q "chat-meilisearch"; then \
		echo "$(YELLOW)Starting Meilisearch...$(NC)"; \
		docker run -d --name chat-meilisearch -p 7700:7700 -e MEILI_MASTER_KEY=DrhYf7zENyR6AlUCKmnz0eYASOQdl6zxH7s7MKFSfFCt getmeili/meilisearch:v1.12.3 || true; \
	fi
	@echo "$(GREEN)✓ Required containers are running$(NC)"

# Environment setup
setup-env: ## Create .env file from example
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env file...$(NC)"; \
		cp .env.example .env; \
		echo "$(GREEN)✓ .env file created.$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Next steps:$(NC)"; \
		echo "  1. Edit .env and add at least one AI provider API key"; \
		echo "  2. Update JWT_SECRET and JWT_REFRESH_SECRET"; \
		echo "  3. Update CREDS_KEY (32 chars) and CREDS_IV (16 chars)"; \
		echo "  4. Run 'make start' to begin"; \
	else \
		echo "$(YELLOW).env file already exists$(NC)"; \
	fi

# Setup vendor environment
setup-vendor-env: ## Setup vendor mode environment
	@if [ -f .env ] && grep -q "VENDOR_MODE=true" .env; then \
		echo "$(GREEN)✓ Vendor mode already configured$(NC)"; \
	else \
		echo "$(YELLOW)Setting up vendor mode...$(NC)"; \
		if [ ! -f .env ]; then \
			cp .env.example .env; \
		fi; \
		if [ -f .env.backup ]; then \
			echo "# =================================="; \
			echo "# HANZO AI VENDOR MODE CONFIGURATION"; \
			echo "# =================================="; \
			echo ""; \
			echo "# Vendor Mode - Hanzo AI"; \
			echo "VENDOR_MODE=true"; \
			echo "VENDOR_NAME=Hanzo AI"; \
			echo "VENDOR_MODEL_DEFAULT=Hanzo Zen-1"; \
			echo "VENDOR_MODEL_PRO=Hanzo Zen-1 Pro"; \
			echo ""; \
			echo "# Branding"; \
			echo "APP_TITLE=Hanzo AI Chat"; \
			echo "VENDOR_BRAND_COLOR=#000000"; \
			echo "VENDOR_LOGO_URL=/assets/hanzo-logo.svg"; \
			echo ""; \
			echo "# Backend Configuration"; \
			echo "VENDOR_BACKEND_ENDPOINT=anthropic"; \
			echo "VENDOR_BACKEND_MODEL_DEFAULT=claude-3-5-sonnet-20241022"; \
			echo "VENDOR_BACKEND_MODEL_PRO=claude-3-opus-20240229"; \
			echo ""; \
			echo "$(GREEN)✓ Vendor mode environment prepared$(NC)"; \
			echo ""; \
			echo "$(YELLOW)Note: Add your backend API key:$(NC)"; \
			echo "  VENDOR_BACKEND_API_KEY=your-api-key"; \
		fi; \
	fi

# Check environment variables
check-env: ## Check if environment is properly configured
	@if [ ! -f .env ]; then \
		echo "$(RED)Error: .env file not found!$(NC)"; \
		echo "Run '$(GREEN)make setup-env$(NC)' to create one from .env.example"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Checking environment configuration...$(NC)"
	@if ! grep -q "^PORT=" .env 2>/dev/null; then \
		echo "$(RED)Error: PORT not set in .env$(NC)"; \
		echo "Add 'PORT=3080' to your .env file"; \
		exit 1; \
	fi
	@if ! grep -q "^MEILI_MASTER_KEY=" .env 2>/dev/null || grep -q "^MEILI_MASTER_KEY=your-master-key-minimum-16-bytes" .env 2>/dev/null; then \
		echo "$(YELLOW)Warning: MEILI_MASTER_KEY not configured$(NC)"; \
		echo "Using default key for development"; \
	fi
	@echo "$(GREEN)✓ Environment check passed$(NC)"

# Publish Docker images
publish: ## Build and publish Docker images with latest and stable tags
	@if ! docker info 2>&1 | grep -q "Username:"; then \
		echo "$(RED)Error: Not logged in to Docker registry$(NC)"; \
		echo ""; \
		echo "$(YELLOW)To publish images, you need to login to GitHub Container Registry:$(NC)"; \
		echo "1. Create a GitHub Personal Access Token with 'write:packages' permission:"; \
		echo "   https://github.com/settings/tokens/new"; \
		echo ""; \
		echo "2. Login using:"; \
		echo "   echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin"; \
		echo ""; \
		exit 1; \
	fi
	@./publish-images.sh

publish-login: ## Login to GitHub Container Registry
	@echo "$(YELLOW)GitHub Container Registry Login$(NC)"
	@echo ""
	@echo "1. First, create a GitHub Personal Access Token with 'write:packages' permission:"
	@echo "   $(BLUE)https://github.com/settings/tokens/new$(NC)"
	@echo ""
	@echo "2. Then run:"
	@echo "   $(GREEN)echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin$(NC)"
	@echo ""

# Shortcuts
s: start
d: down
l: logs
r: restart

.PHONY: help start vendor up down stop restart logs logs-api ps build \
        dev install install-force build-packages dev-backend dev-frontend \
        lint format db-shell db-backup db-restore clean clean-all \
        status test shell check-docker check-containers check-env setup-env \
        setup-vendor-env update-branding init-fixtures publish publish-login s d l r
