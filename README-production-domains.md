# Hanzo AI Platform - Production Domain Mapping

## 🌐 Production Domains

| Service | Local URL | Production URL | Description |
|---------|-----------|----------------|-------------|
| **IAM** | http://localhost:8000 | https://hanzo.id | Identity & Access Management |
| **Cloud** | http://localhost:3000 | https://cloud.hanzo.ai | AI Platform Dashboard |
| **Router** | http://localhost:4000 | https://api.hanzo.ai | LLM Gateway API |
| **Chat** | http://localhost:3081 | https://chat.hanzo.ai | AI Chat Interface |
| **Services** | http://localhost:3333 | https://hanzo.services | Service Orchestration |

## 🏗️ Architecture

### Local Development Mode

In local development, the platform runs with:
- **LOCAL_DEV_MODE=true** - Bypasses organization/team requirements
- **SKIP_ORG_CHECK=true** - No org validation
- **SINGLE_TENANT_MODE=true** - Simplified permissions

This allows developers to:
- Access all features without team setup
- View complete logs and analytics
- Test integrations freely
- Use same tools as production

### Production Mode

In production:
- Full multi-tenant support
- Organization & team management required
- Role-based access control (RBAC)
- Audit logging enabled
- Domain-based routing

## 🔄 Service Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                        hanzo.services                            │
│                    (Service Orchestration)                       │
├─────────────────────────────────────────────────────────────────┤
│                              │                                   │
│     ┌────────────┬───────────┴───────────┬────────────┐        │
│     ▼            ▼                       ▼            ▼        │
│  hanzo.id    cloud.hanzo.ai         api.hanzo.ai  chat.hanzo.ai│
│   (IAM)        (Cloud)               (Router)       (Chat)      │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Environment Configuration

### Local Development (.env)
```bash
# Core Settings
LOCAL_DEV_MODE=true
SKIP_ORG_CHECK=true
SINGLE_TENANT_MODE=true

# Service URLs (local)
IAM_URL=http://localhost:8000
CLOUD_URL=http://localhost:3000
ROUTER_URL=http://localhost:4000
CHAT_URL=http://localhost:3081
SERVICES_URL=http://localhost:3333
```

### Production Configuration
```bash
# Core Settings
LOCAL_DEV_MODE=false
SKIP_ORG_CHECK=false
SINGLE_TENANT_MODE=false

# Service URLs (production)
IAM_URL=https://hanzo.id
CLOUD_URL=https://cloud.hanzo.ai
ROUTER_URL=https://api.hanzo.ai
CHAT_URL=https://chat.hanzo.ai
SERVICES_URL=https://hanzo.services
```

## 🚀 Migration Path

### From Local to Production

1. **Update Domain Configuration**
   ```yaml
   # traefik/nginx configuration
   - Host(`hanzo.id`) → IAM service
   - Host(`cloud.hanzo.ai`) → Cloud service
   - Host(`api.hanzo.ai`) → Router service
   - Host(`chat.hanzo.ai`) → Chat service
   - Host(`hanzo.services`) → Services bridge
   ```

2. **Configure SSL/TLS**
   - Let's Encrypt for all domains
   - Wildcard cert for *.hanzo.ai
   - Separate cert for hanzo.id

3. **Update OAuth Redirects**
   - IAM OAuth apps point to production URLs
   - Social login callbacks use production domains

4. **Enable Production Features**
   - Turn off LOCAL_DEV_MODE
   - Enable organization checks
   - Configure audit logging
   - Set up monitoring

## 🔐 Authentication Flow

### Local Development
```
User → Any Service → Auto-authenticated (dev mode)
```

### Production
```
User → Service → Redirect to hanzo.id → OAuth → Service
                                ↓
                        hanzo.services (orchestration)
```

## 📊 Logging & Analytics

### Local Mode Benefits
- All logs visible without org context
- Full analytics dashboard access
- Debug mode enabled by default
- No usage limits

### Production Mode
- Logs scoped to organization
- Analytics filtered by permissions
- Audit trail for compliance
- Usage metering enabled

## 🛠️ Development Workflow

1. **Start Local Stack**
   ```bash
   docker compose up -d
   ```

2. **Access Services**
   - IAM: http://localhost:8000
   - Cloud: http://localhost:3000 (configure models & pricing)
   - Chat: http://localhost:3081 (test AI interactions)
   - Services: http://localhost:3333 (view orchestration)

3. **Monitor Everything**
   - All services log to stdout
   - ClickHouse stores metrics
   - MinIO stores artifacts
   - No org restrictions

## 🌟 Key Advantages

### For Developers
- Full production stack locally
- No org/team setup required
- Complete visibility into all services
- Same tools as production

### For Migration
- Identical architecture
- Easy domain mapping
- Gradual feature enablement
- Consistent APIs

### For Testing
- Integration testing simplified
- No permission barriers
- Full feature access
- Production-like environment

## 📝 Notes

- hanzo.id is our identity domain (like clerk.com)
- hanzo.services orchestrates all services
- cloud.hanzo.ai manages AI configuration
- api.hanzo.ai is the unified LLM gateway
- chat.hanzo.ai is one of many possible frontends