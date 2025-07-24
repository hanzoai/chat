#!/bin/bash

echo "🧹 Cleaning up Hanzo Chat to restore clean LibreChat structure..."
echo "This will remove all embedded LiteLLM proxy code and configure for api.hanzo.ai"
echo ""

# Stop any running services first
echo "📦 Stopping services..."
make down 2>/dev/null || docker compose down 2>/dev/null || true

# Remove LiteLLM directories
echo "🗑️  Removing embedded LiteLLM proxy code..."
rm -rf litellm/ litellm-js/ litellm-proxy-extras/ 2>/dev/null
rm -rf enterprise/ cookbook/ benchmark/ docs/ 2>/dev/null
rm -rf ui/litellm-dashboard/ 2>/dev/null
rm -rf scripts/cost_sync/ scripts/litellm_*.py 2>/dev/null

# Remove LiteLLM specific files
echo "🗑️  Removing LiteLLM specific files..."
rm -f pyproject.toml setup.py requirements*.txt tox.ini 2>/dev/null
rm -f pytest.ini mypy.ini ruff.toml poetry.lock 2>/dev/null
rm -f model_prices*.json proxy_server_config.yaml cost_tracking.json 2>/dev/null
rm -f Makefile.litellm .circleci/config.yml 2>/dev/null
rm -f *.whl 2>/dev/null
rm -rf dist/ build/ *.egg-info/ 2>/dev/null

# Remove LiteLLM test directories
echo "🗑️  Removing LiteLLM test directories..."
rm -rf tests/test_litellm/ tests/proxy_*/ tests/load_tests/ 2>/dev/null
rm -rf tests/llm_translation/ tests/local_testing/ tests/pass_through_tests/ 2>/dev/null
rm -rf tests/router_unit_tests/ tests/budget_manager_tests/ 2>/dev/null
rm -rf tests/litellm_*/ 2>/dev/null

# Remove database/cache directories that shouldn't be in git
echo "🗑️  Removing local data directories..."
rm -rf meili_data*/ data-node/ logs/ .pytest_cache/ .ruff_cache/ 2>/dev/null
rm -rf __pycache__/ .mypy_cache/ .coverage htmlcov/ 2>/dev/null
rm -f *.log *.db *.sqlite 2>/dev/null

# Remove deployment specific files that aren't LibreChat
echo "🗑️  Removing non-LibreChat deployment files..."
rm -rf deploy/ helm/ vercel/ railway/ k8s/ terraform/ 2>/dev/null
rm -f netlify.toml vercel.json fly.toml render.yaml 2>/dev/null

# Clean up Python artifacts
echo "🗑️  Cleaning Python artifacts..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type f -name "*.pyd" -delete 2>/dev/null || true
find . -type f -name ".coverage" -delete 2>/dev/null || true
find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "✅ Cleanup complete! Your Hanzo Chat now has a clean LibreChat structure."
echo ""
echo "📝 Next steps:"
echo "1. Update .env to use api.hanzo.ai:"
echo "   OPENAI_BASE_URL=https://api.hanzo.ai/v1"
echo "   OPENAI_API_KEY=your-hanzo-api-key"
echo ""
echo "2. The following core directories remain:"
echo "   - api/          (LibreChat API)"
echo "   - client/       (LibreChat frontend)"  
echo "   - packages/     (Shared packages)"
echo "   - config/       (Configuration)"
echo "   - e2e/          (End-to-end tests)"
echo ""
echo "3. Run 'make up' to start services with the clean setup"