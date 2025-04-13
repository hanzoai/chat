# LibreChat + Hanzo MCP Makefile
# Provides targets for managing LibreChat environment

.PHONY: help setup start-mcp stop-mcp restart-mcp check-mcp use-sse use-stdio

# Default target - shows help
help:
	@echo "LibreChat + Hanzo MCP Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make setup        - Create/update .env with API keys"
	@echo "  make start-mcp    - Start MCP server"
	@echo "  make stop-mcp     - Stop MCP server"
	@echo "  make restart-mcp  - Restart MCP server"
	@echo "  make check-mcp    - Check MCP server status"
	@echo "  make use-sse      - Use SSE transport for MCP"
	@echo "  make use-stdio    - Use stdio transport for MCP"
	@echo "  make help         - Show this help message"

# Setup environment
setup:
	@echo "Setting up LibreChat environment..."
	@if [ ! -f .env ]; then \
		cp .env-example .env; \
		echo "Created .env file from .env-example"; \
	fi
	@echo "Updating .env to include API keys and enable agents..."
	@if ! grep -q "OPENAI_API_KEY" .env; then \
		echo "# API Keys" >> .env; \
		echo "OPENAI_API_KEY=your_openai_key_here" >> .env; \
		echo "ANTHROPIC_API_KEY=your_anthropic_key_here" >> .env; \
		echo "Added API key placeholders to .env file"; \
	fi
	@if grep -q "^ENDPOINTS=" .env; then \
		sed -i '' 's/^ENDPOINTS=.*/ENDPOINTS=openAI,anthropic,assistants,custom,agents/' .env; \
	else \
		echo "ENDPOINTS=openAI,anthropic,assistants,custom,agents" >> .env; \
	fi
	@echo "Updated ENDPOINTS in .env to include agents"
	@echo ""
	@echo "Environment setup complete. Please edit .env to add your actual API keys."

# Start MCP server
start-mcp:
	@echo "Starting MCP server..."
	@if [ -f mcp_server.pid ]; then \
		echo "MCP server is already running with PID $$(cat mcp_server.pid)"; \
		echo "Use 'make restart-mcp' to restart it."; \
	else \
		./run_mcp_server.py & \
		echo "MCP server started. Server is running at http://localhost:3001/sse"; \
	fi

# Stop MCP server
stop-mcp:
	@echo "Stopping MCP server..."
	@if [ -f mcp_server.pid ]; then \
		kill $$(cat mcp_server.pid) 2>/dev/null || true; \
		rm mcp_server.pid; \
		echo "MCP server stopped"; \
	else \
		echo "No MCP server is running"; \
	fi

# Restart MCP server
restart-mcp: stop-mcp start-mcp

# Check MCP server status
check-mcp:
	@if [ -f mcp_server.pid ]; then \
		PID=$$(cat mcp_server.pid); \
		if ps -p $$PID > /dev/null; then \
			echo "MCP server is running with PID $$PID"; \
		else \
			echo "MCP server is not running (stale PID file)"; \
			rm mcp_server.pid; \
		fi; \
	else \
		echo "No MCP server is running"; \
	fi

# Switch to SSE transport
use-sse:
	@echo "Switching to SSE transport for MCP..."
	@cp librechat.yaml librechat.yaml.backup
	@cp -f librechat.yaml.stdio librechat.yaml
	@sed -i '' 's/type: stdio/type: sse/' librechat.yaml
	@sed -i '' 's/command: python3/url: http:\/\/localhost:3001\/sse/' librechat.yaml
	@sed -i '' '/args:/d' librechat.yaml
	@sed -i '' '/- -m/d' librechat.yaml
	@sed -i '' '/- hanzo_mcp.cli/d' librechat.yaml
	@sed -i '' '/- --port/d' librechat.yaml
	@sed -i '' '/- "3001"/d' librechat.yaml
	@echo "Configuration updated to use SSE transport"
	@echo "You will need to restart LibreChat for changes to take effect"

# Switch to stdio transport
use-stdio:
	@echo "Switching to stdio transport for MCP..."
	@cp librechat.yaml librechat.yaml.backup
	@cp -f librechat.yaml.stdio librechat.yaml
	@echo "Configuration updated to use stdio transport"
	@echo "You will need to restart LibreChat for changes to take effect"