#!/bin/bash
# Initialize demo user for Hanzo Chat
# Run this after docker compose up

echo "🚀 Initializing Hanzo Chat demo user..."
echo "📧 Email: hattori@hanzo.ai"
echo "🔑 Password: demo1234"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Run the seed script inside a temporary container
docker run --rm \
  --network chat_hanzo-network \
  -e MONGO_URI="mongodb://hanzo:hanzo123@hanzo-mongodb:27017/HanzoChat?authSource=admin" \
  -v "$PWD/scripts:/scripts" \
  -w /scripts \
  node:18-alpine sh -c "
    npm install mongoose bcryptjs
    node seed_demo_user.js
  "

echo ""
echo "✅ Demo user initialization complete!"
echo "🌐 Access Hanzo Chat at: http://localhost:3081"
echo "📧 Login with: hattori@hanzo.ai / demo1234"