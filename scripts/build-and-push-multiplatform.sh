#!/bin/bash

# Exit on any error
set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="hanzochat"
IMAGE_NAME="chat"
PLATFORMS="linux/amd64,linux/arm64"
VERSION=$(grep '"version"' package.json | cut -d '"' -f 4)

echo -e "${GREEN}Building multi-platform Docker images for $DOCKER_REGISTRY/$IMAGE_NAME${NC}"
echo -e "${YELLOW}Version: $VERSION${NC}"
echo -e "${YELLOW}Platforms: $PLATFORMS${NC}"

# Ensure we're using the multi-platform builder
echo -e "\n${YELLOW}Setting up Docker buildx...${NC}"
docker buildx use cloud-builder || docker buildx create --name cloud-builder --use

# Build and push main Dockerfile with both tags
echo -e "\n${GREEN}Building from Dockerfile...${NC}"
docker buildx build \
  --platform $PLATFORMS \
  --tag $DOCKER_REGISTRY/$IMAGE_NAME:latest \
  --tag $DOCKER_REGISTRY/$IMAGE_NAME:stable \
  --tag $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION \
  --push \
  -f Dockerfile \
  .

# Build and push Dockerfile.multi with both tags
echo -e "\n${GREEN}Building from Dockerfile.multi (optimized)...${NC}"
docker buildx build \
  --platform $PLATFORMS \
  --tag $DOCKER_REGISTRY/$IMAGE_NAME:latest-multi \
  --tag $DOCKER_REGISTRY/$IMAGE_NAME:stable-multi \
  --tag $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION-multi \
  --push \
  -f Dockerfile.multi \
  .

echo -e "\n${GREEN}✅ Successfully built and pushed all images!${NC}"
echo -e "${YELLOW}Images pushed:${NC}"
echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:latest"
echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:stable"
echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION"
echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:latest-multi"
echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:stable-multi"
echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION-multi"