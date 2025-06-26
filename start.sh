#!/bin/bash

# Chat Quick Start Script

# Check if .env exists, create from example if not
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add at least one AI provider API key before starting!"
    echo "   - OPENAI_API_KEY=sk-..."
    echo "   - ANTHROPIC_API_KEY=sk-ant-..."
    echo "   - Or any other supported provider"
    echo ""
    exit 1
fi

# Start services
echo "Starting Chat..."
docker compose up -d

# Check if services started successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Chat is running!"
    echo ""
    echo "🌐 Access the application at: http://localhost:3080"
    echo ""
    echo "📋 Useful commands:"
    echo "   • View logs:   docker compose logs -f"
    echo "   • Stop:        docker compose down"
    echo "   • Restart:     docker compose restart"
else
    echo "❌ Failed to start services. Check Docker is running."
fi