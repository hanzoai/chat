# Hanzo AI Chat

A clean deployment of LibreChat configured to use Hanzo AI's cloud services.

## Architecture

```
┌─────────────────────────┐     ┌─────────────────────────┐
│     Hanzo Chat UI       │────▶│   api.hanzo.ai          │
│   (LibreChat Fork)      │     │                         │
│    localhost:3081       │     │  • AI Models (100+)     │
└─────────────────────────┘     │  • Runtime Execution    │
            │                   │  • MCP Tools            │
            │                   └─────────────────────────┘
            ▼
┌─────────────────────────┐
│   Local Data Storage    │
│  • MongoDB (chat history)│
│  • Meilisearch (search) │
└─────────────────────────┘
```

## Features

- 🤖 **Unified AI Access**: All models through api.hanzo.ai
- 💬 **Clean LibreChat UI**: Familiar ChatGPT-like interface
- 🔍 **Full-Text Search**: Local Meilisearch integration
- 📝 **Chat History**: Local MongoDB storage
- 🛠️ **MCP Tools**: Model Context Protocol support
- 🚀 **Code Execution**: Via Hanzo's cloud runtime

## Quick Start

### 1. Setup

```bash
# Copy environment template
cp .env.hanzo-cloud .env

# Edit .env and add your Hanzo API key
# Get your key at: https://hanzo.ai/dashboard
nano .env
```

### 2. Start Services

```bash
# Using the clean Makefile
make -f Makefile.clean up

# Or using docker-compose directly
docker compose -f docker-compose.hanzo-clean.yml up -d
```

### 3. Access Chat

1. Open http://localhost:3081
2. Click "Sign up" to create your first account
3. Start chatting with AI models!

## Configuration

### Required Settings

```env
# Your Hanzo API key
OPENAI_API_KEY=sk-hanzo-your-key-here

# Hanzo API endpoint (default)
OPENAI_BASE_URL=https://api.hanzo.ai/v1
```

### Optional Settings

```env
# Enable/disable features
MCP_ENABLED=true
ALLOW_REGISTRATION=true

# Customize branding
APP_TITLE=Hanzo AI Chat
CUSTOM_FOOTER=Powered by Hanzo AI
```

## Available Models

Through api.hanzo.ai, you have access to:

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3.5, Claude 3)
- Google (Gemini Pro, Gemini Ultra)
- Meta (Llama 3.1)
- Mistral
- And 100+ more models

## Commands

```bash
# Service management
make -f Makefile.clean up       # Start services
make -f Makefile.clean down     # Stop services
make -f Makefile.clean restart  # Restart services
make -f Makefile.clean logs     # View logs
make -f Makefile.clean status   # Check status
make -f Makefile.clean clean    # Remove everything

# Development
make -f Makefile.clean dev      # Run in foreground
make -f Makefile.clean build    # Build containers
```

## Project Structure

```
hanzo/chat/
├── api/                    # LibreChat API backend
├── client/                 # LibreChat React frontend
├── packages/              # Shared packages
├── docker-compose.hanzo-clean.yml  # Clean deployment
├── .env.hanzo-cloud       # Environment template
└── Makefile.clean         # Simplified commands
```

## Troubleshooting

### Chat not loading?
- Check services: `make -f Makefile.clean status`
- View logs: `make -f Makefile.clean logs`
- Ensure MongoDB and Meilisearch are healthy

### Authentication issues?
- Registration is enabled by default
- First user should be given admin access
- Check `ALLOW_REGISTRATION=true` in .env

### API errors?
- Verify your Hanzo API key is correct
- Check api.hanzo.ai is accessible
- View chat container logs for details

## Support

- Hanzo AI Dashboard: https://hanzo.ai/dashboard
- API Documentation: https://docs.hanzo.ai
- Support: support@hanzo.ai