# LiteLLM Makefile
# Simple Makefile for running tests and basic development tasks

.PHONY: help test test-unit test-integration test-unit-helm lint format install-dev install-proxy-dev install-test-deps install-helm-unittest check-circular-imports check-import-safety up down logs restart status clean test-platform

# Default compose file for platform
COMPOSE_FILE := compose-simple.yml

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
help:
	@echo "$(GREEN)=== Hanzo AI Platform ===$(NC)"
	@echo ""
	@echo "$(YELLOW)Platform Management:$(NC)"
	@echo "  $(GREEN)make up$(NC)         - Start all services"
	@echo "  $(GREEN)make down$(NC)       - Stop all services"
	@echo "  $(GREEN)make logs$(NC)       - View logs (all services)"
	@echo "  $(GREEN)make restart$(NC)    - Restart all services"
	@echo "  $(GREEN)make status$(NC)     - Check service status"
	@echo "  $(GREEN)make clean$(NC)      - Stop services and remove volumes"
	@echo ""
	@echo "$(YELLOW)Development Commands:$(NC)"
	@echo "  make install-dev        - Install development dependencies"
	@echo "  make install-proxy-dev  - Install proxy development dependencies"
	@echo "  make install-dev-ci     - Install dev dependencies (CI-compatible, pins OpenAI)"
	@echo "  make install-proxy-dev-ci - Install proxy dev dependencies (CI-compatible)"
	@echo "  make install-test-deps  - Install test dependencies"
	@echo "  make install-helm-unittest - Install helm unittest plugin"
	@echo "  make format             - Apply Black code formatting"
	@echo "  make format-check       - Check Black code formatting (matches CI)"
	@echo "  make lint               - Run all linting (Ruff, MyPy, Black check, circular imports, import safety)"
	@echo "  make lint-ruff          - Run Ruff linting only"
	@echo "  make lint-mypy          - Run MyPy type checking only"
	@echo "  make lint-black         - Check Black formatting (matches CI)"
	@echo "  make check-circular-imports - Check for circular imports"
	@echo "  make check-import-safety - Check import safety"
	@echo "  make test               - Run all tests"
	@echo "  make test-platform      - Test platform services (health & API)"
	@echo "  make test-unit          - Run unit tests (tests/test_litellm)"
	@echo "  make test-integration   - Run integration tests"
	@echo "  make test-unit-helm     - Run helm unit tests"

# Installation targets
install-dev:
	poetry install --with dev

install-proxy-dev:
	poetry install --with dev,proxy-dev --extras proxy

# CI-compatible installations (matches GitHub workflows exactly)
install-dev-ci:
	pip install openai==1.81.0
	poetry install --with dev
	pip install openai==1.81.0

install-proxy-dev-ci:
	poetry install --with dev,proxy-dev --extras proxy
	pip install openai==1.81.0

install-test-deps: install-proxy-dev
	poetry run pip install "pytest-retry==1.6.3"
	poetry run pip install pytest-xdist
	cd enterprise && python -m pip install -e . && cd ..

install-helm-unittest:
	helm plugin install https://github.com/helm-unittest/helm-unittest --version v0.4.4

# Formatting
format: install-dev
	cd litellm && poetry run black . && cd ..

format-check: install-dev
	cd litellm && poetry run black --check . && cd ..

# Linting targets
lint-ruff: install-dev
	cd litellm && poetry run ruff check . && cd ..

lint-mypy: install-dev
	poetry run pip install types-requests types-setuptools types-redis types-PyYAML
	cd litellm && poetry run mypy . --ignore-missing-imports && cd ..

lint-black: format-check

check-circular-imports: install-dev
	cd litellm && poetry run python ../tests/documentation_tests/test_circular_imports.py && cd ..

check-import-safety: install-dev
	poetry run python -c "from litellm import *" || (echo '🚨 import failed, this means you introduced unprotected imports! 🚨'; exit 1)

# Combined linting (matches test-linting.yml workflow)
lint: format-check lint-ruff lint-mypy check-circular-imports check-import-safety

# Testing targets
test:
	poetry run pytest tests/

test-unit: install-test-deps
	poetry run pytest tests/test_litellm -x -vv -n 4

test-integration:
	poetry run pytest tests/ -k "not test_litellm"

test-unit-helm: install-helm-unittest
	helm unittest -f 'tests/*.yaml' deploy/charts/litellm-helm

# LLM Translation testing targets
test-llm-translation: install-test-deps
	@echo "Running LLM translation tests..."
	@python .github/workflows/run_llm_translation_tests.py

test-llm-translation-single: install-test-deps
	@echo "Running single LLM translation test file..."
	@if [ -z "$(FILE)" ]; then echo "Usage: make test-llm-translation-single FILE=test_filename.py"; exit 1; fi
	@mkdir -p test-results
	poetry run pytest tests/llm_translation/$(FILE) \
		--junitxml=test-results/junit.xml \
		-v --tb=short --maxfail=100 --timeout=300

# =================================
# Platform Management Commands
# =================================

# Start all services
up:
	@echo "$(GREEN)🚀 Starting Hanzo AI Platform...$(NC)"
	@docker compose -f $(COMPOSE_FILE) up -d --remove-orphans
	@echo "$(YELLOW)⏳ Waiting for services to be ready...$(NC)"
	@sleep 5
	@docker start hanzo-chat 2>/dev/null || true
	@echo ""
	@echo "$(GREEN)✅ Platform is starting!$(NC)"
	@echo ""
	@echo "$(YELLOW)📋 Access Points:$(NC)"
	@echo "  • Chat Interface:  http://localhost:3081"
	@echo "  • Router API:      http://localhost:4000"
	@echo "  • Runtime API:     http://localhost:3003"
	@echo "  • Meilisearch:     http://localhost:7700"
	@echo ""
	@echo "$(YELLOW)🔑 Router API Key:$(NC) sk-hanzo-master-key"
	@echo ""
	@echo "Run '$(GREEN)make test$(NC)' to verify everything is working"

# Stop all services
down:
	@echo "$(RED)⏹️  Stopping Hanzo AI Platform...$(NC)"
	@docker compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✅ All services stopped$(NC)"

# View logs
logs:
	@docker compose -f $(COMPOSE_FILE) logs -f

# View chat logs specifically
logs-chat:
	@docker compose -f $(COMPOSE_FILE) logs -f chat

# View router logs specifically
logs-router:
	@docker compose -f $(COMPOSE_FILE) logs -f router

# Restart all services
restart:
	@echo "$(YELLOW)🔄 Restarting services...$(NC)"
	@$(MAKE) down
	@$(MAKE) up

# Check status
status:
	@echo "$(YELLOW)📊 Service Status:$(NC)"
	@docker compose -f $(COMPOSE_FILE) ps

# Clean everything (including volumes)
clean:
	@echo "$(RED)🧹 Cleaning up everything...$(NC)"
	@docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
	@echo "$(GREEN)✅ Cleanup complete$(NC)"

# Test platform services
test-platform:
	@echo "$(YELLOW)🧪 Testing Hanzo AI Platform...$(NC)"
	@echo ""
	@echo -n "$(YELLOW)Router Health:$(NC) "
	@curl -s http://localhost:4000/health >/dev/null 2>&1 && echo "$(GREEN)✅ OK$(NC)" || echo "$(RED)❌ Failed$(NC)"
	@echo -n "$(YELLOW)Chat Health:$(NC)   "
	@curl -s http://localhost:3081/health >/dev/null 2>&1 && echo "$(GREEN)✅ OK$(NC)" || echo "$(RED)❌ Failed$(NC)"
	@echo -n "$(YELLOW)Search Health:$(NC) "
	@curl -s http://localhost:7700/health >/dev/null 2>&1 && echo "$(GREEN)✅ OK$(NC)" || echo "$(RED)❌ Failed$(NC)"
	@echo -n "$(YELLOW)Runtime Health:$(NC) "
	@curl -s http://localhost:3003/api/health >/dev/null 2>&1 && echo "$(GREEN)✅ OK$(NC)" || echo "$(RED)❌ Failed$(NC)"
	@echo ""
	@echo -n "$(YELLOW)Router API Test (Anthropic):$(NC) "
	@curl -s -X POST http://localhost:4000/v1/chat/completions \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer sk-hanzo-master-key" \
		-d '{"model": "hanzo-zen-1", "messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 5}' \
		2>/dev/null | grep -q "OK" && echo "$(GREEN)✅ Working$(NC)" || echo "$(RED)❌ Failed$(NC)"
	@echo ""
	@echo "$(YELLOW)Available Models:$(NC)"
	@curl -s http://localhost:4000/v1/models -H "Authorization: Bearer sk-hanzo-master-key" 2>/dev/null | jq -r '.data[].id' | head -5 | sed 's/^/  • /'
	@echo ""
	@docker compose -f $(COMPOSE_FILE) ps --format "table {{.Name}}\t{{.Status}}"