# Vendor Mode - White Label Deployments

Vendor Mode allows you to deploy Hanzo Chat as a white-labeled AI assistant with your own branding, while hiding all configuration complexity from end users.

## Features

- **Custom Branding**: Use your own name, logo, and colors
- **Fixed Model Names**: Present your own model names (e.g., "ACME Assistant" instead of "Claude 3.5")
- **Hidden Configuration**: No endpoint selection, API keys, or model switching for users
- **Backend Flexibility**: Route to any supported AI provider (OpenAI, Anthropic, Hanzo AI, etc.)
- **Simplified UI**: Clean interface focused on conversations only

## Quick Start

1. Copy the vendor example configuration:
   ```bash
   cp .env.vendor-example .env
   ```

2. Edit `.env` and set:
   - `VENDOR_MODE=true`
   - Your brand name and model names
   - Your backend API configuration

3. Start the application:
   ```bash
   docker compose up -d
   ```

## Configuration Options

### Basic Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `VENDOR_MODE` | Enable vendor mode | `true` |
| `VENDOR_NAME` | Your brand name | `ACME AI` |
| `VENDOR_MODEL_DEFAULT` | Default model display name | `ACME Assistant` |
| `VENDOR_MODEL_PRO` | Premium model display name | `ACME Assistant Pro` |

### Branding (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_TITLE` | Browser title | `ACME AI Chat` |
| `VENDOR_BRAND_COLOR` | Primary brand color | `#FF6B6B` |
| `VENDOR_LOGO_URL` | Path to logo image | `/assets/acme-logo.svg` |

### Backend Configuration

| Variable | Description | Options |
|----------|-------------|---------|
| `VENDOR_BACKEND_ENDPOINT` | AI provider to use | `openAI`, `anthropic`, `hanzoai`, `custom` |
| `VENDOR_BACKEND_API_KEY` | API key for the provider | Your API key |
| `VENDOR_BACKEND_BASE_URL` | Custom API endpoint | `https://api.hanzo.ai/v1` |
| `VENDOR_BACKEND_MODEL_DEFAULT` | Actual model for default | `claude-3-5-sonnet-20241022` |
| `VENDOR_BACKEND_MODEL_PRO` | Actual model for pro | `claude-3-5-opus-latest` |

## Example Configurations

### Using Anthropic Claude

```env
VENDOR_MODE=true
VENDOR_NAME=MyCompany AI
VENDOR_MODEL_DEFAULT=MyCompany Assistant
VENDOR_MODEL_PRO=MyCompany Assistant Pro

VENDOR_BACKEND_ENDPOINT=anthropic
VENDOR_BACKEND_API_KEY=sk-ant-api03-YOUR-KEY
VENDOR_BACKEND_MODEL_DEFAULT=claude-3-5-sonnet-20241022
VENDOR_BACKEND_MODEL_PRO=claude-3-5-opus-latest
```

### Using OpenAI

```env
VENDOR_MODE=true
VENDOR_NAME=SmartBot
VENDOR_MODEL_DEFAULT=SmartBot Basic
VENDOR_MODEL_PRO=SmartBot Advanced

VENDOR_BACKEND_ENDPOINT=openAI
VENDOR_BACKEND_API_KEY=sk-YOUR-OPENAI-KEY
VENDOR_BACKEND_MODEL_DEFAULT=gpt-4o-mini
VENDOR_BACKEND_MODEL_PRO=gpt-4o
```

### Using Hanzo AI API

```env
VENDOR_MODE=true
VENDOR_NAME=Enterprise AI
VENDOR_MODEL_DEFAULT=Enterprise Assistant
VENDOR_MODEL_PRO=Enterprise Assistant Plus

VENDOR_BACKEND_ENDPOINT=hanzoai
VENDOR_BACKEND_API_KEY=hsk-YOUR-HANZO-KEY
VENDOR_BACKEND_BASE_URL=https://api.hanzo.ai/v1
VENDOR_BACKEND_MODEL_DEFAULT=hanzo-zen-1
VENDOR_BACKEND_MODEL_PRO=hanzo-zen-1-pro
```

## What Users See

When vendor mode is enabled, users will see:

1. **Your Brand Name** - Displayed throughout the UI
2. **Your Model Names** - No mention of underlying AI providers
3. **Simplified Interface** - No configuration options or API key inputs
4. **Clean Chat Experience** - Focus on conversations only

Users will NOT see:
- Endpoint/provider selection dropdown
- Model switching options
- API key configuration
- Advanced settings
- References to OpenAI, Anthropic, etc.

## Advanced Customization

### Custom Logo

1. Add your logo to `client/public/assets/your-logo.svg`
2. Set `VENDOR_LOGO_URL=/assets/your-logo.svg`

### Custom Colors

Set `VENDOR_BRAND_COLOR` to your primary brand color. This will be used for:
- Primary buttons
- Active states
- Accent colors throughout the UI

### Multiple Models

You can offer different tiers by routing to different models:
- Basic tier → GPT-4o-mini or Claude Sonnet
- Pro tier → GPT-4o or Claude Opus
- Enterprise tier → Custom fine-tuned models

## Deployment Best Practices

1. **API Key Security**: Never expose your actual API keys to users
2. **Rate Limiting**: Implement rate limiting at the application level
3. **Usage Tracking**: Monitor usage per user/organization
4. **Custom Domain**: Use your own domain (e.g., chat.yourcompany.com)
5. **SSL/TLS**: Always use HTTPS in production

## Troubleshooting

### Models Not Showing
- Ensure `VENDOR_MODE=true` is set
- Check that all required vendor variables are configured
- Restart the application after changes

### Backend Errors
- Verify your API key is correct
- Check that the backend endpoint is properly configured
- Ensure the actual model names match what's available from your provider

### UI Not Updating
- Clear browser cache
- Restart the application
- Check browser console for errors

## Support

For issues specific to vendor mode, please check:
- The `.env` configuration is correct
- All required variables are set
- The backend API is accessible
- Rate limits are not exceeded

For general Hanzo Chat support, see the main documentation.