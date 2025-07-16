#!/bin/bash

# Cleanup script to remove embedded LiteLLM proxy code from Hanzo Chat
# The chat should use the external Hanzo Router, not have its own proxy

echo "🧹 Cleaning up embedded LiteLLM proxy code from Hanzo Chat..."
echo "The chat application should connect to the external Hanzo Router service"
echo ""

# Directories to remove (LiteLLM proxy code that shouldn't be in chat)
DIRS_TO_REMOVE=(
    "litellm"
    "litellm-js"
    "litellm-proxy-extras"
    "enterprise"
    "cookbook"
    "benchmark"
    "docs"
    "model_prices_and_context_window_backup.json"
    "model_prices_and_context_window.json"
    "proxy_server_config.yaml"
    "cost_tracking.json"
    "ui"  # If this is the LiteLLM UI, not LibreChat UI
)

# Python test directories that are LiteLLM specific
TEST_DIRS_TO_REMOVE=(
    "tests/test_litellm"
    "tests/proxy_unit_tests"
    "tests/proxy_admin_ui_tests"
    "tests/load_tests"
    "tests/llm_translation"
    "tests/local_testing"
    "tests/pass_through_tests"
    "tests/proxy_batch_tests"
    "tests/router_unit_tests"
)

echo "⚠️  This will remove the following directories:"
for dir in "${DIRS_TO_REMOVE[@]}"; do
    if [ -e "$dir" ]; then
        echo "  - $dir"
    fi
done

for dir in "${TEST_DIRS_TO_REMOVE[@]}"; do
    if [ -e "$dir" ]; then
        echo "  - $dir"
    fi
done

echo ""
read -p "Are you sure you want to remove these directories? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing directories..."
    
    for dir in "${DIRS_TO_REMOVE[@]}"; do
        if [ -e "$dir" ]; then
            echo "Removing $dir..."
            rm -rf "$dir"
        fi
    done
    
    for dir in "${TEST_DIRS_TO_REMOVE[@]}"; do
        if [ -e "$dir" ]; then
            echo "Removing $dir..."
            rm -rf "$dir"
        fi
    done
    
    # Remove LiteLLM specific files
    echo "Removing LiteLLM specific files..."
    rm -f pyproject.toml setup.py requirements*.txt tox.ini
    rm -f Makefile.litellm pytest.ini mypy.ini
    rm -f *.whl dist/ build/
    
    echo ""
    echo "✅ Cleanup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Ensure OPENAI_BASE_URL points to your Hanzo Router (http://router:4000/v1)"
    echo "2. Set OPENAI_API_KEY=proxy (or your router key)"
    echo "3. The chat will now use the external Hanzo Router for all LLM calls"
    
else
    echo "Cleanup cancelled."
fi