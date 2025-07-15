# Hanzo AI Chat Stack

A fully integrated AI chat platform powered by Hanzo AI infrastructure, featuring a customized chat interface with Hanzo Router as the unified LLM gateway.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least one LLM API key (OpenAI, Anthropic, or Together AI)

### One-Command Deployment

```bash
# Set your API keys
export ANTHROPIC_API_KEY=your-api-key-here
# Optional: export OPENAI_API_KEY=...
# Optional: export TOGETHER_API_KEY=...

# Deploy the entire stack
make -f Makefile.hanzo deploy
```

This will:
1. Build all Docker images with Hanzo branding
2. Start all required services (PostgreSQL, Redis, MongoDB, Meilisearch)
3. Launch the Hanzo Router on port 4000
4. Start the Hanzo Chat UI on port 3081
5. Configure Nginx reverse proxy

## Access Points

- **Chat UI**: http://localhost:3081
- **Hanzo Router API**: http://localhost:4000/v1
- **Router Admin**: http://localhost:4000/ui
- **API Documentation**: http://localhost:4000/docs

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Hanzo Chat    │────▶│   Hanzo Router   │────▶│   LLM Providers │
│   (Custom UI)   │     │  (Port 4000)     │     │  (Anthropic,    │
│   Port 3081     │     │                  │     │   OpenAI, etc)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│    MongoDB      │     │   PostgreSQL     │
│  (Chat History) │     │  (Router Data)   │
└─────────────────┘     └──────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Meilisearch    │     │      Redis       │
│    (Search)     │     │    (Caching)     │
└─────────────────┘     └──────────────────┘
```

## Available Models

### Hanzo AI Models
- **hanzo-zen-1**: Fast, efficient AI for most tasks (Claude 3.5 Sonnet)
- **hanzo-zen-1-pro**: Advanced reasoning for complex tasks (Claude 3 Opus)

### Additional Models
- GPT-4, GPT-3.5 Turbo (via OpenAI)
- Mixtral 8x7B (via Together AI)
- Any model supported by Hanzo Router

## Management Commands

```bash
# View all available commands
make -f Makefile.hanzo help

# Start/stop services
make -f Makefile.hanzo up
make -f Makefile.hanzo down
make -f Makefile.hanzo restart

# View logs
make -f Makefile.hanzo logs
make -f Makefile.hanzo logs-chat
make -f Makefile.hanzo logs-router

# Check service health
make -f Makefile.hanzo status

# Run tests
make -f Makefile.hanzo test

# Backup/restore data
make -f Makefile.hanzo backup
make -f Makefile.hanzo restore BACKUP=hanzo-backup-20240714-120000
```

## Configuration

### Environment Variables
Copy `.env.hanzo.example` to `.env` and configure:

```bash
# Required: At least one LLM API key
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
TOGETHER_API_KEY=...

# Optional: Customize passwords (recommended for production)
POSTGRES_PASSWORD=your-secure-password
MONGO_PASSWORD=your-secure-password
REDIS_PASSWORD=your-secure-password
LITELLM_MASTER_KEY=your-master-key
```

### Model Configuration
Edit `hanzo-config.yaml` to add or modify available models.

## MCP Integration

The Hanzo Chat stack includes Model Context Protocol (MCP) support for enhanced AI capabilities:

1. File operations and code analysis
2. Web search and browsing
3. Agent delegation
4. Tool execution

MCP servers are configured in `mcp_servers.json`.

## Development

### Local Development Setup
```bash
# Install dependencies
make -f Makefile.hanzo dev-setup

# Run frontend dev server
make -f Makefile.hanzo dev-frontend

# Run backend dev server
make -f Makefile.hanzo dev-backend
```

### Building Images
```bash
# Build locally
make -f Makefile.hanzo build

# Push to registry
make -f Makefile.hanzo push
```

## Production Deployment

For production deployment:

1. Update all passwords and keys in `.env`
2. Configure SSL certificates in `nginx.hanzo.conf`
3. Set proper domain names
4. Enable authentication providers
5. Configure monitoring and logging

```bash
# Deploy with production settings
make -f Makefile.hanzo prod-deploy
```

## Troubleshooting

### Services not starting
- Check Docker is running
- Verify API keys are set correctly
- Check port availability (3081, 4000, 5432, 6379, 27017, 7700)

### Chat not connecting to Router
- Verify Hanzo Router is healthy: `curl http://localhost:4000/health`
- Check API keys in environment
- Review logs: `make -f Makefile.hanzo logs-router`

### Database issues
- Ensure volumes have proper permissions
- Check disk space availability
- Review database logs

## Support

For issues and questions:
- GitHub: https://github.com/hanzoai
- Documentation: https://docs.hanzo.ai