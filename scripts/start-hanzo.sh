#!/bin/bash
# Hanzo AI Platform - Quick Start Script

set -e

echo "🚀 Starting Hanzo AI Platform..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.hanzo.example .env
    echo "⚠️  Please add your LLM API keys to .env file"
    echo ""
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

# Check if services are already running
if [ "$(docker ps -q -f name=hanzo-)" ]; then
    echo "⚠️  Hanzo services are already running. Stopping them first..."
    docker compose down
    echo ""
fi

# Start services
echo "🔨 Building and starting services..."
docker compose up -d

# Wait for services
echo ""
echo "⏳ Waiting for services to be healthy..."
echo "   This may take 1-2 minutes on first run..."

# Function to check service health
check_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo "   ✅ $service is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo "   ❌ $service failed to start"
    return 1
}

# Check each service
check_service "IAM" "http://localhost:8000/v1/iam/get-account"
check_service "Router" "http://localhost:4000/health/readiness"
check_service "Cloud" "http://localhost:3000"
check_service "Chat" "http://localhost:3081/health"

echo ""
echo "🎉 Hanzo AI Platform is ready!"
echo ""
echo "📋 Access Points:"
echo "   • Cloud Dashboard: http://localhost:3000"
echo "   • Chat Interface:  http://localhost:3081"
echo "   • IAM Dashboard:   http://localhost:8000"
echo "   • Router API:      http://localhost:4000"
echo ""
echo "🔑 Default Login:"
echo "   • Email: admin@hanzo.ai"
echo "   • Password: demo1234"
echo ""
echo "📚 Documentation:"
echo "   • Platform Overview: README-PLATFORM.md"
echo "   • Production Setup:  README-production-domains.md"
echo ""
echo "💡 Next Steps:"
echo "   1. Add your API keys to .env file"
echo "   2. Configure models at http://localhost:3000"
echo "   3. Start chatting at http://localhost:3081"
echo ""
echo "🛑 To stop: docker compose down"
echo "📊 View logs: docker compose logs -f [service-name]"
echo ""