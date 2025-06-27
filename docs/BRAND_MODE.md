# Brand Mode

Brand Mode enables white-label deployments of Hanzo Chat with custom branding and model names. Perfect for SaaS providers who want to offer AI chat capabilities under their own brand.

## Overview

When Brand Mode is enabled:

- Your brand name replaces "Hanzo Chat" throughout the UI
- Custom model names (e.g., "ACME Assistant") replace actual AI provider names
- Provider selection and API key configuration are hidden from users
- All requests are routed through your configured backend

## Quick Start

1. Copy the brand mode example configuration:

```bash
cp .env.brand-example .env
```

2. Configure your brand settings:

```env
# Enable Brand Mode
BRAND_MODE=true

# Your Brand
BRAND_NAME=ACME AI
BRAND_MODEL_DEFAULT=ACME Assistant
BRAND_MODEL_PRO=ACME Assistant Pro

# Branding
APP_TITLE=ACME AI Chat
BRAND_COLOR=#FF6B6B
BRAND_LOGO_URL=/assets/acme-logo.svg

# Backend (hidden from users)
BRAND_BACKEND_ENDPOINT=anthropic
BRAND_BACKEND_API_KEY=your-api-key
BRAND_BACKEND_MODEL_DEFAULT=claude-3-5-sonnet-20241022
BRAND_BACKEND_MODEL_PRO=claude-3-opus-20240229
```

3. Start the application:

```bash
docker compose up
```

## Configuration Options

### Required Settings

- `BRAND_MODE=true` - Enable brand mode
- `BRAND_NAME` - Your brand name (shown in UI)
- `BRAND_MODEL_DEFAULT` - Name for your standard model
- `BRAND_MODEL_PRO` - Name for your premium model
- `BRAND_BACKEND_ENDPOINT` - Actual AI provider (openAI, anthropic, hanzoai, etc.)
- `BRAND_BACKEND_API_KEY` - Your API key for the AI provider

### Optional Branding

- `APP_TITLE` - Browser title and app header
- `BRAND_COLOR` - Primary brand color (hex)
- `BRAND_LOGO_URL` - Path to your logo
- `BRAND_FAVICON_URL` - Path to your favicon

### Backend Options

#### Using OpenAI

```env
BRAND_BACKEND_ENDPOINT=openAI
BRAND_BACKEND_API_KEY=sk-...
BRAND_BACKEND_MODEL_DEFAULT=gpt-4o-mini
BRAND_BACKEND_MODEL_PRO=gpt-4o
```

#### Using Anthropic

```env
BRAND_BACKEND_ENDPOINT=anthropic
BRAND_BACKEND_API_KEY=sk-ant-...
BRAND_BACKEND_MODEL_DEFAULT=claude-3-5-sonnet-20241022
BRAND_BACKEND_MODEL_PRO=claude-3-opus-20240229
```

#### Using Hanzo AI API

```env
BRAND_BACKEND_ENDPOINT=hanzoai
BRAND_BACKEND_API_KEY=hsk-...
BRAND_BACKEND_BASE_URL=https://api.hanzo.ai/v1
BRAND_BACKEND_MODEL_DEFAULT=hanzo-zen-1
BRAND_BACKEND_MODEL_PRO=hanzo-zen-1-pro
```

## What Users See

In Brand Mode, users only see:

- Your brand name (ACME AI)
- Your model names (ACME Assistant, ACME Assistant Pro)
- Your logo and colors
- No configuration options or provider details

## Docker Deployment

```yaml
# docker-compose.yml
services:
  chat:
    image: ghcr.io/hanzoai/chat:latest
    env_file: .env
    ports:
      - '3080:3080'
    volumes:
      - ./branding:/app/client/public/assets/brand:ro
```

## Custom Branding Assets

Place your branding assets in the `branding/` directory:

```
branding/
├── logo.svg       # Your logo
├── favicon.ico    # Your favicon
└── styles.css     # Custom CSS (optional)
```

## Advanced Configuration

### Model Mapping

Map multiple backend models to your brand models:

```env
BRAND_MODE_MODEL_MAPPING='{
  "gpt-4o": "ACME Assistant Pro",
  "gpt-4": "ACME Assistant",
  "claude-3-5-sonnet": "ACME Assistant Pro",
  "claude-3-sonnet": "ACME Assistant"
}'
```

### Hide UI Elements

```env
BRAND_MODE_HIDE_ENDPOINT_MENU=true
BRAND_MODE_HIDE_API_KEYS=true
BRAND_MODE_HIDE_MODEL_SELECTOR=false
```

## Production Considerations

1. **Security**: Store API keys securely, not in plain text
2. **Monitoring**: Track usage and costs per deployment
3. **Updates**: Keep the Hanzo Chat image updated
4. **Compliance**: Ensure your deployment meets data privacy requirements

## Troubleshooting

### Brand not showing

- Verify `BRAND_MODE=true` is set
- Check Docker logs: `docker logs <container-name>`
- Ensure environment variables are loaded

### Models not working

- Verify backend API key is valid
- Check model names match provider's models
- Test backend endpoint connectivity

## Example: Azou AI Deployment

```env
# Azou AI Brand Mode Configuration
BRAND_MODE=true
BRAND_NAME=Azou AI
BRAND_MODEL_DEFAULT=Azou Finance
BRAND_MODEL_PRO=Azou Finance Pro

# Azou Branding
APP_TITLE=Azou Chat
BRAND_COLOR=#6B46C1
BRAND_LOGO_URL=/assets/azou-logo.svg

# Backend using Anthropic
BRAND_BACKEND_ENDPOINT=anthropic
BRAND_BACKEND_API_KEY=${ANTHROPIC_API_KEY}
BRAND_BACKEND_MODEL_DEFAULT=claude-3-5-sonnet-20241022
BRAND_BACKEND_MODEL_PRO=claude-3-opus-20240229
```

This creates a financial analysis focused deployment under the Azou brand, while using Anthropic's Claude models behind the scenes.
