# Hanzo Chat Demo User

When running Hanzo Chat locally, a demo user is automatically created for quick access.

## Demo User Credentials

- **Email**: `hattori@hanzo.ai`
- **Password**: `demo1234`
- **Role**: Admin

## Quick Start

1. Start the Hanzo stack:
   ```bash
   docker compose up -d
   ```

2. Access Hanzo Chat:
   - Open your browser to http://localhost:3081
   - Log in with the demo credentials above

## Manual Demo User Creation

If you need to manually create the demo user (e.g., after resetting the database):

```bash
./init-demo-user.sh
```

Or using the Makefile:

```bash
make -f Makefile.hanzo init-demo
```

## Security Note

⚠️ **This demo user is for local development only!** 

Never use these credentials in production. Always:
- Change default passwords
- Use proper authentication methods
- Disable demo users in production environments

## Customizing the Demo User

To modify the demo user details, edit `scripts/seed_demo_user.js` and change:
- Name
- Email
- Password
- Role (USER or ADMIN)
- Avatar URL

After making changes, restart the stack or run the initialization script again.