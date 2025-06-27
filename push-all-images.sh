#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    Docker Images Ready to Push       ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Get current date for stable tag
STABLE_TAG="stable-$(date +%Y%m%d)"

echo -e "${GREEN}Built Images:${NC}"
echo ""
echo -e "${YELLOW}1. Chat Application:${NC}"
echo "   - ghcr.io/hanzoai/chat:latest"
echo "   - ghcr.io/hanzoai/chat:stable"
echo "   - ghcr.io/hanzoai/chat:$STABLE_TAG"
echo ""
echo -e "${YELLOW}2. RAG API:${NC}"
echo "   - ghcr.io/hanzoai/chat-rag-api:latest"
echo "   - ghcr.io/hanzoai/chat-rag-api:stable"
echo "   - ghcr.io/hanzoai/chat-rag-api:$STABLE_TAG"
echo ""

echo -e "${BLUE}To push these images:${NC}"
echo ""
echo "1. Login to GitHub Container Registry:"
echo "   echo YOUR_PAT | docker login ghcr.io -u zeekay --password-stdin"
echo ""
echo "2. Push all images:"
echo "   # Chat images"
echo "   docker push ghcr.io/hanzoai/chat:latest"
echo "   docker push ghcr.io/hanzoai/chat:stable"
echo "   docker push ghcr.io/hanzoai/chat:$STABLE_TAG"
echo ""
echo "   # RAG API images"
echo "   docker push ghcr.io/hanzoai/chat-rag-api:latest"
echo "   docker push ghcr.io/hanzoai/chat-rag-api:stable"
echo "   docker push ghcr.io/hanzoai/chat-rag-api:$STABLE_TAG"
echo ""
echo -e "${YELLOW}Or use the automated scripts:${NC}"
echo "   ./publish-images.sh        # For GitHub Container Registry"
echo "   ./push-to-dockerhub.sh     # For Docker Hub"
echo ""