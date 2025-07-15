# 🚀 Hanzo AI Platform - Complete Stack

Welcome to the Hanzo AI Platform! This is a production-ready, open-source AI infrastructure stack that you can run locally or deploy to production.

## 🎯 Quick Start

```bash
# Clone and start the complete platform
git clone https://github.com/hanzoai/chat.git
cd chat
docker compose up -d

# Wait for services to be healthy (about 1-2 minutes)
docker compose ps

# Access the platform
open http://localhost:3000  # Cloud Dashboard
open http://localhost:3081  # Chat Interface
open http://localhost:8000  # IAM Dashboard
```

## 🏗️ What's Included

### Core Services

| Service | Port | Description | Production URL |
|---------|------|-------------|----------------|
| **Cloud** | 3000 | AI Platform Dashboard | cloud.hanzo.ai |
| **Chat** | 3081 | AI Chat Interface | chat.hanzo.ai |
| **Router** | 4000 | LLM Gateway (100+ providers) | api.hanzo.ai |
| **IAM** | 8000 | Identity & Access Management | hanzo.id |
| **Services** | 3333 | Service Orchestration | hanzo.services |

### Infrastructure

- **PostgreSQL** - Primary database
- **MySQL** - IAM database
- **MongoDB** - Chat storage
- **ClickHouse** - Analytics
- **Redis** - Caching
- **Meilisearch** - Full-text search
- **MinIO** - S3-compatible storage

## 🔑 Default Access

### Admin Account
- **Email**: admin@hanzo.ai
- **Password**: demo1234

### Service Keys
- **Router API**: sk-hanzo-master-key
- **MinIO**: minio / miniosecret

## 🎨 Key Features

### For Developers
- **Local Dev Mode** - No org/team setup required
- **Full Visibility** - Access all logs and metrics
- **Hot Reload** - Development mode with live updates
- **Production Parity** - Same stack as production

### Platform Capabilities
- **Multi-Model AI** - Route between 100+ LLM providers
- **Cost Tracking** - Monitor and control AI spending
- **Usage Analytics** - Full metrics and monitoring
- **Team Management** - Multi-tenant support (production)
- **Social Login** - Google, GitHub, and more
- **API Gateway** - OpenAI-compatible endpoints

## 📊 Using the Platform

### 1. Configure AI Models (Cloud Dashboard)

1. Navigate to http://localhost:3000
2. Login with admin@hanzo.ai
3. Go to Models section
4. Add your API keys:
   - OpenAI
   - Anthropic
   - Custom providers
5. Set pricing and rate limits

### 2. Chat with AI

1. Open http://localhost:3081
2. Login via IAM (redirects automatically)
3. Select configured models
4. Start chatting!

### 3. Monitor Usage

- View metrics in Cloud dashboard
- Check logs in real-time
- Track costs per model/user
- Analyze conversation patterns

## 🛠️ Configuration

### Essential Environment Variables

Create `.env` file:

```bash
# Required: At least one LLM provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Social login
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Optional: Production domains
PRODUCTION_IAM_URL=https://hanzo.id
PRODUCTION_CLOUD_URL=https://cloud.hanzo.ai
PRODUCTION_API_URL=https://api.hanzo.ai
```

## 🔄 Development Workflow

### Hot Reload Development

```bash
# Use development compose file
docker compose -f compose.dev.yml up

# Services with hot reload:
# - Cloud (Next.js)
# - Chat (React)
# - Router (Python)
# - Services (NestJS)
```

### Adding New Models

1. Configure in Cloud dashboard
2. Router automatically picks up changes
3. Models available in Chat immediately

### Customizing Auth

1. Edit IAM configuration
2. Add OAuth providers
3. Configure redirects
4. Update Chat SSO settings

## 🚢 Production Deployment

### Domain Setup

| Service | Development | Production |
|---------|------------|------------|
| IAM | localhost:8000 | hanzo.id |
| Cloud | localhost:3000 | cloud.hanzo.ai |
| API | localhost:4000 | api.hanzo.ai |
| Chat | localhost:3081 | chat.hanzo.ai |
| Services | localhost:3333 | hanzo.services |

### Migration Checklist

- [ ] Update domain configurations
- [ ] Configure SSL certificates
- [ ] Set production environment variables
- [ ] Enable organization mode
- [ ] Configure backup strategies
- [ ] Set up monitoring/alerting
- [ ] Configure rate limiting
- [ ] Enable audit logging

## 📚 Documentation

- [IAM Integration](./README-iam-integration.md) - Authentication setup
- [Platform Architecture](./README-hanzo-platform.md) - Complete overview
- [Production Domains](./README-production-domains.md) - Domain mapping
- [Demo User Guide](./README-demo-user.md) - Quick access setup

## 🤝 Community & Support

- **GitHub**: [github.com/hanzoai](https://github.com/hanzoai)
- **Discord**: [Join our community](https://discord.gg/hanzoai)
- **Documentation**: [docs.hanzo.ai](https://docs.hanzo.ai)

## 🎯 Use Cases

### For Startups
- Complete AI infrastructure from day one
- Scale from local to global deployment
- Pay only for what you use

### For Enterprises
- Self-hosted AI platform
- Full data sovereignty
- Custom model integration
- Compliance-ready logging

### For Developers
- Learn from production architecture
- Contribute improvements
- Build on top of the platform
- Create custom integrations

## 🔮 Roadmap

- [ ] Kubernetes Helm charts
- [ ] One-click cloud deployment
- [ ] Mobile SDKs
- [ ] More LLM providers
- [ ] Enhanced monitoring dashboard
- [ ] Automated model selection
- [ ] Cost optimization algorithms

## 📝 License

MIT License - Use freely in your projects!

---

**Ready to build the future of AI?** Start with `docker compose up -d` and you're running the same stack that powers Hanzo AI in production! 🚀