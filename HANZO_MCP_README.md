# Hanzo MCP Integration with LibreChat

This document provides instructions for setting up and using the Hanzo MCP server with LibreChat.

## Overview

The Hanzo MCP server provides a set of tools for file management, code execution, and project analysis that can be used by LLMs through LibreChat's agent interface. The integration allows Claude or other LLMs to:

- Navigate and manipulate the filesystem
- Run shell commands
- Execute Python scripts
- Analyze code and project structures
- Edit files and Jupyter notebooks

## Setup

### Prerequisites

- Python 3.12 or higher
- hanzo-mcp v0.3.0 or higher (`pip install hanzo-mcp>=0.3.0`)
- LibreChat installed and configured

### Configuration

The integration has been pre-configured in this repository with:

1. **MCP Server Configuration**: Both SSE and stdio transport modes are supported
2. **Run Script**: A Python script to manage the MCP server
3. **Makefile**: Commands to control the server and switch between transport modes

## Usage

### Starting the MCP Server

```bash
# Start the MCP server with SSE transport (recommended)
make start-mcp

# Check if the MCP server is running
make check-mcp

# Stop the MCP server
make stop-mcp

# Restart the MCP server
make restart-mcp
```

### Switching Transport Modes

The MCP server can run in two modes:

```bash
# Use SSE transport (recommended for production)
make use-sse

# Use stdio transport (useful for debugging)
make use-stdio
```

After switching transport modes, restart LibreChat for the changes to take effect.

### Using with LibreChat

1. Ensure the MCP server is running (`make start-mcp`)
2. Open LibreChat in your browser
3. Create a new chat with Claude or another LLM
4. Enable the "Agents" toggle in the interface
5. The LLM can now access the Hanzo MCP tools

## Features

The Hanzo MCP server provides these capabilities:

- **File System Tools**: Read, write, edit, search, and analyze files
- **Shell Command Tools**: Execute shell commands and scripts
- **Project Analysis**: Analyze project structure and dependencies
- **Jupyter Notebook Tools**: Read and edit Jupyter notebooks

## Configuration Options

Advanced users can modify the MCP server configuration by editing `run_mcp_server.py` or the MCP server entries in `librechat.yaml`.

### MCP Server Arguments

The following arguments can be configured:

- `--transport`: Transport protocol (stdio or sse)
- `--port`: Port for SSE transport (default: 3001)
- `--host`: Host for SSE binding (default: 0.0.0.0)
- `--allow-path`: Add an allowed path (can specify multiple times)
- `--agent-model`: Model for agent tool (LiteLLM format)
- `--enable-agent-tool`: Enable the agent tool
- `--log-level`: Logging level (DEBUG, INFO, WARNING, ERROR)

## Troubleshooting

If you encounter issues:

1. Check if the server is running: `make check-mcp`
2. Look for error messages in the terminal running the MCP server
3. Check the LibreChat logs for connection issues
4. Try switching transport modes: `make use-stdio` or `make use-sse`

## Updating

To update the Hanzo MCP server:

```bash
pip install --upgrade hanzo-mcp
```

After updating, restart the MCP server with `make restart-mcp`.
