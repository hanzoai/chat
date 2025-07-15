# Hanzo AI Platform - Complete Local Stack

This is the complete Hanzo AI platform running locally, mirroring our production architecture.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Hanzo AI Platform Stack                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Hanzo Chat  │    │ Hanzo Cloud │    │ Hanzo IAM   │    │Hanzo Router │  │
│  │   :3081     │    │   :3000     │    │   :8000     │    │   :4000     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                  │                    │          │
│         └──────────────────┴──────────────────┴────────────────────┘         │
│                                       │                                       │
├───────────────────────────────────────┴───────────────────────────────────────┤
│                              Data Layer                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ PostgreSQL  │    │   MySQL     │    │  MongoDB    │    │ ClickHouse  │  │
│  │   :5432     │    │   :3306     │    │   :27017    │    │   :8123     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Redis     │    │ Meilisearch │    │   MinIO     │                      │
│  │   :6379     │    │   :7700     │    │   :9001     │                      │
│  └─────────────┘    └─────────────┘    └─────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Services

### Core Applications

1. **Hanzo IAM** (Port 8000)
   - Identity & Access Management (like Clerk)
   - User authentication & authorization
   - Social login providers (Google, GitHub)
   - OAuth2/OpenID Connect server
   - Multi-tenant support

2. **Hanzo Cloud** (Port 3000)
   - AI Platform management dashboard
   - Model configuration & pricing
   - Usage analytics & monitoring
   - Project & organization management
   - API key management

3. **Hanzo Router** (Port 4000)
   - Unified LLM gateway (100+ providers)
   - Cost tracking & rate limiting
   - Model routing & fallbacks
   - OpenAI-compatible API
   - MCP (Model Context Protocol) support

4. **Hanzo Chat** (Port 3081)
   - AI chat interface
   - Multi-model support via Router
   - SSO via IAM
   - Document handling & search
   - Conversation management

### Data Stores

- **PostgreSQL**: Router config, Cloud data
- **MySQL**: IAM users & auth
- **MongoDB**: Chat conversations
- **ClickHouse**: Analytics & metrics
- **Redis**: Caching & sessions
- **Meilisearch**: Full-text search
- **MinIO**: S3-compatible object storage

## 📋 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Hanzo IAM | http://localhost:8000 | Identity management |
| Hanzo Cloud | http://localhost:3000 | Platform dashboard |
| Hanzo Router | http://localhost:4000 | LLM gateway API |
| Hanzo Chat | http://localhost:3081 | Chat interface |
| MinIO Console | http://localhost:9001 | Storage management |

## 🔑 Default Credentials

### IAM Users
- **Admin**: admin@hanzo.ai / demo1234
- **Demo**: hattori@hanzo.ai / demo1234

### Service Keys
- **Router Master Key**: sk-hanzo-master-key
- **MinIO**: minio / miniosecret

## 🛠️ Configuration

### Model Configuration (via Cloud UI)

1. Access Cloud dashboard: http://localhost:3000
2. Navigate to Models section
3. Add/configure LLM providers:
   - OpenAI models
   - Anthropic models
   - Custom endpoints
   - Pricing & limits

### Authentication Flow

```
User → Chat → IAM (OAuth) → Authorized → Router → LLM Provider
         ↓
       Cloud (for config)
```

## 🚀 Quick Start

```bash
# Start the complete stack
docker compose up -d

# Wait for all services to be healthy
docker compose ps

# Access services:
# - IAM: http://localhost:8000
# - Cloud: http://localhost:3000
# - Chat: http://localhost:3081
```

## 🔧 Environment Variables

Create `.env` file:

```bash
# LLM Providers (at least one required)
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
TOGETHER_API_KEY=your-key

# Optional: Social Login
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

## 📊 Using the Platform

### 1. Configure Models (Cloud)
- Login to Cloud with admin@hanzo.ai
- Add API keys for providers
- Configure model pricing
- Set rate limits

### 2. Manage Users (IAM)
- Create users/organizations
- Configure OAuth applications
- Set up social providers
- Manage permissions

### 3. Chat with AI (Chat)
- Login via IAM SSO
- Select models configured in Cloud
- Chat with automatic routing via Router
- Track usage in Cloud dashboard

## 🔄 Production Parity

This local setup mirrors production:
- Same service architecture
- Same authentication flow
- Same data storage patterns
- Same API interfaces

Migration to production requires:
1. Update database credentials
2. Configure proper domains
3. Set production API keys
4. Enable SSL/TLS
5. Configure cloud storage

## 🛟 Troubleshooting

### Service Health Checks
```bash
# Check all services
docker compose ps

# View logs
docker compose logs [service-name]

# Restart a service
docker compose restart [service-name]
```

### Common Issues

1. **IAM not accessible**
   - Check MySQL is running
   - Verify init data loaded

2. **Cloud build fails**
   - Ensure Node.js dependencies installed
   - Check PostgreSQL connection

3. **Router unhealthy**
   - Verify PostgreSQL is running
   - Check config file mounted

4. **Chat can't authenticate**
   - Ensure IAM is healthy
   - Check OAuth redirect URLs

## 🏗️ Development

For development with hot-reload:
```bash
docker compose -f compose.dev.yml up
```

This mounts source code for:
- Live editing
- Hot module replacement
- Instant updates