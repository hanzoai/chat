# Hanzo IAM Integration

The Hanzo Chat stack now includes **Hanzo IAM** (Identity & Access Management) as the central authentication provider, similar to how Clerk works in production environments.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Hanzo Chat    │────▶│   Hanzo IAM     │────▶│ Social Providers│
│  (Port: 3081)   │     │  (Port: 8000)   │     │ Google, GitHub  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Hanzo Router   │     │     MySQL       │
│  (Port: 4000)   │     │  (Port: 3306)   │
└─────────────────┘     └─────────────────┘
```

## Features

- **Centralized Authentication**: All user authentication goes through IAM
- **Social Login**: Connect with Google, GitHub (configurable)
- **SSO/OAuth2**: Full OAuth2 implementation
- **User Management**: Centralized user database in MySQL
- **Multi-Application Support**: Can authenticate multiple services
- **Production-Ready**: Same architecture used in Hanzo production

## Default Users

Two users are pre-configured in IAM:

1. **Admin User**
   - Email: `admin@hanzo.ai`
   - Password: `demo1234`
   - Role: Global Admin

2. **Demo User**
   - Email: `hattori@hanzo.ai`
   - Password: `demo1234`
   - Role: Regular User

## Accessing Services

1. **IAM Dashboard**: http://localhost:8000
   - Login with admin credentials
   - Manage users, applications, providers

2. **Hanzo Chat**: http://localhost:3081
   - Click "Login with Hanzo IAM"
   - Redirects to IAM for authentication
   - Returns to Chat after login

## Configuration

### Environment Variables

```bash
# For social login providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### IAM Configuration

- Config file: `iam/conf/app_local.conf`
- Init data: `iam/init_data_local.json`
- Customize providers, applications, users

### OAuth Application

The Chat application is pre-configured in IAM:
- Client ID: `hanzo-chat-client`
- Client Secret: `hanzo-chat-secret-change-in-production`
- Redirect URIs configured for localhost

## Production Migration

This local setup mirrors production architecture:

1. **Same Components**: IAM, Router, Chat, databases
2. **Same Auth Flow**: OAuth2/OpenID Connect
3. **Same Configuration**: Environment-based config
4. **Easy Migration**: Change URLs and credentials for production

## Adding New Applications

To add a new application to authenticate via IAM:

1. Login to IAM as admin
2. Go to Applications → New Application
3. Configure OAuth settings
4. Update your app with client credentials

## Security Notes

⚠️ **For local development only!**

Before production:
- Change all default passwords
- Generate new client secrets
- Use proper SSL/TLS
- Configure production database credentials
- Set up proper CORS policies

## Troubleshooting

1. **Can't login to Chat**
   - Ensure IAM is healthy: `docker logs hanzo-iam`
   - Check OAuth redirect URLs match

2. **Social login not working**
   - Add provider credentials to environment
   - Configure redirect URLs in provider console

3. **IAM not starting**
   - Check MySQL is running
   - Verify init data JSON is valid