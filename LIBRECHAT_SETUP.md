# LibreChat with Hanzo MCP Setup

This guide explains how to set up LibreChat with Hanzo MCP server, OpenAI, Anthropic, and LM Studio models.

## Prerequisites

- Python 3.x installed with `hanzo_mcp` module
- LibreChat installed and configured
- LM Studio running with the deepseek-r1-distill-qwen-7b model

## Setup with Makefile

A Makefile has been provided to simplify setup and management. Here's how to use it:

### Initial Setup

```bash
# Set up the environment
make setup

# Edit .env to add your actual API keys
nano .env
```

In the .env file, replace the placeholder values for `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` with your actual API keys.

### Start the MCP Server

```bash
# Start the MCP server
make start-mcp
```

### Managing the MCP Server

```bash
# Check MCP server status
make check-mcp

# Stop the MCP server
make stop-mcp

# Restart the MCP server
make restart-mcp
```

### Switching Transport Methods

If you have issues with one transport method, you can switch to another:

```bash
# Switch to SSE transport
make use-sse

# Switch to stdio transport
make use-stdio
```

After changing the transport method, restart both the MCP server and LibreChat.

## Configuration

The current configuration includes:

1. API integrations:
   - OpenAI
   - Anthropic
   - LM Studio

2. Models:
   - deepseek-r1-distill-qwen-7b (from LM Studio)
   - And other models available in LM Studio

3. Enabled interfaces:
   - Agents interface
   - Side panel
   - Model selection
   - Presets & prompts
   - Bookmarks
   - Multi-conversation support

## Troubleshooting

1. If LibreChat can't connect to the MCP server:
   - Verify the MCP server is running with `make check-mcp`
   - Try switching the transport method
   - Check the logs for error messages

2. If LM Studio models aren't appearing:
   - Verify LM Studio is running at http://192.168.1.189:1234/v1
   - Check if the models are loaded in LM Studio

3. If the agents interface isn't available:
   - Make sure `agents` is included in the ENDPOINTS environment variable
   - Verify the correct configuration is being used

For more detailed information, refer to the [LibreChat documentation](https://docs.librechat.ai/).