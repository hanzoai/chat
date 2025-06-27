#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Registry and organization
REGISTRY="ghcr.io"
ORG="hanzoai"

# Image names
CHAT_IMAGE="$REGISTRY/$ORG/chat"
RAG_API_IMAGE="$REGISTRY/$ORG/chat-rag-api"

# Get current date for stable tag
STABLE_TAG="stable-$(date +%Y%m%d)"

echo -e "${BLUE}Starting Docker image build and publish process...${NC}"

# Function to build and push image
build_and_push() {
    local image_name=$1
    local dockerfile=$2
    local context=$3
    
    echo -e "${BLUE}Building $image_name...${NC}"
    
    # Build the image
    docker build -f "$dockerfile" -t "$image_name:latest" "$context"
    
    # Tag as stable
    docker tag "$image_name:latest" "$image_name:$STABLE_TAG"
    docker tag "$image_name:latest" "$image_name:stable"
    
    echo -e "${GREEN}Successfully built $image_name${NC}"
    
    # Push all tags
    echo -e "${BLUE}Pushing $image_name:latest...${NC}"
    docker push "$image_name:latest"
    
    echo -e "${BLUE}Pushing $image_name:$STABLE_TAG...${NC}"
    docker push "$image_name:$STABLE_TAG"
    
    echo -e "${BLUE}Pushing $image_name:stable...${NC}"
    docker push "$image_name:stable"
    
    echo -e "${GREEN}Successfully pushed all tags for $image_name${NC}"
}

# Check if user is logged in to GitHub Container Registry
echo -e "${BLUE}Checking Docker registry login...${NC}"
if ! docker info 2>/dev/null | grep -q "Username: "; then
    echo -e "${RED}Please login to GitHub Container Registry first:${NC}"
    echo "docker login ghcr.io -u YOUR_GITHUB_USERNAME"
    exit 1
fi

# Build and push main chat application
echo -e "${BLUE}Building main chat application...${NC}"
build_and_push "$CHAT_IMAGE" "Dockerfile" "."

# Check if rag_api directory exists
if [ -d "../rag_api" ]; then
    echo -e "${BLUE}Building chat-rag-api from ../rag_api directory...${NC}"
    build_and_push "$RAG_API_IMAGE" "../rag_api/Dockerfile" "../rag_api"
elif [ -d "rag_api" ]; then
    echo -e "${BLUE}Building chat-rag-api from rag_api directory...${NC}"
    build_and_push "$RAG_API_IMAGE" "rag_api/Dockerfile" "rag_api"
else
    echo -e "${RED}Warning: rag_api directory not found. Skipping chat-rag-api build.${NC}"
    echo "To build chat-rag-api, ensure the rag_api source code is available."
fi

echo -e "${GREEN}✅ All images have been built and published successfully!${NC}"
echo -e "${BLUE}Published tags:${NC}"
echo "  - latest"
echo "  - stable"
echo "  - $STABLE_TAG"

# Update docker-compose.yml to use the new images
echo -e "${BLUE}Reminder: The docker-compose files have been updated to use:${NC}"
echo "  - Service name: chat-rag-api (previously rag_api)"
echo "  - Image: ghcr.io/hanzoai/chat-rag-api:latest"