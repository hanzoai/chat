# Hanzo Chat Demo Setup Guide

## Quick Start

Since the chat application starts with no users, you'll need to register your first account.

### Option 1: Register via Web UI (Recommended)

1. Navigate to http://localhost:3081
2. Click "Sign up" or "Register" link
3. Create an account with:
   - **Admin Demo**: 
     - Email: `admin@hanzo.ai`
     - Password: `demo1234`
   - **Regular Demo User**:
     - Email: `demo@hanzo.ai`
     - Password: `demo1234`

### Option 2: Create Users via MongoDB

If you need to create demo users programmatically:

```bash
# Access MongoDB shell
docker exec -it hanzo-mongodb mongosh mongodb://hanzo:hanzo123@localhost:27017/HanzoChat?authSource=admin

# Create demo admin user
db.users.insertOne({
  email: "admin@hanzo.ai",
  username: "admin",
  name: "Hanzo Admin",
  password: "$2a$10$hashed_password_here", // Use bcrypt to hash "demo1234"
  role: "ADMIN",
  isVerified: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshToken: [],
  plugins: []
});
```

### Option 3: Environment Configuration

To show demo credentials on the login page when running locally, add to your `.env`:

```bash
# Show demo credentials on login page (development only)
SHOW_DEMO_CREDENTIALS=true
DEMO_EMAIL=admin@hanzo.ai
DEMO_PASSWORD=demo1234
```

## Features Available After Login

Once logged in, you'll have access to:

- **MCP Tools**: File operations, search, code analysis
- **Agent Features**: Multi-agent workflows via Hanzo Agent SDK
- **LLM Gateway**: Access to 100+ AI providers through unified interface
- **Custom Branding**: Hanzo AI themed interface

## Troubleshooting

### Registration Not Working?
- Ensure `ALLOW_REGISTRATION=true` is set in environment
- Check MongoDB is running: `docker ps | grep mongodb`
- Check logs: `docker logs hanzo-chat`

### Login Issues?
- Clear browser cookies for localhost:3081
- Verify user exists in database using MongoDB commands above
- Check JWT secrets are properly set in environment

### MCP Tools Not Showing?
- Verify `MCP_ENABLED=true` in container environment
- Check MCP servers configuration at `/app/mcp_servers.hanzo.json`
- Restart the chat service: `make restart`

## Security Note

These demo credentials are for local development only. In production:
- Use strong, unique passwords
- Disable demo credential display
- Enable proper authentication (OAuth, LDAP, etc.)
- Use environment-specific secrets