#!/bin/bash
# Initialize demo user for Hanzo Chat
# This script runs when the chat container starts

echo "🚀 Checking for demo user initialization..."

# Wait for MongoDB to be ready
until mongosh --host mongodb:27017 --username hanzo --password ${MONGO_PASSWORD:-hanzo123} --authenticationDatabase admin --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  echo "⏳ Waiting for MongoDB to be ready..."
  sleep 2
done

echo "✅ MongoDB is ready"

# Run the seed script
node /app/scripts/seed_demo_user.js

echo "✅ Demo user initialization complete"