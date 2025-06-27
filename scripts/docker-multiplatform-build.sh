#!/bin/bash

# Exit on any error
set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-hanzochat}"
IMAGE_NAME="${IMAGE_NAME:-chat}"
VERSION=$(grep '"version"' package.json | cut -d '"' -f 4)

# Platform configuration
PLATFORMS="linux/amd64,linux/arm64"

echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Multi-platform Docker Build${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${YELLOW}Registry: ${DOCKER_REGISTRY}/${IMAGE_NAME}${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo -e "${YELLOW}Platforms: ${PLATFORMS}${NC}"
echo -e "${BLUE}======================================${NC}"

# Check Docker login status
if ! docker info 2>&1 | grep -q "Username:"; then
    echo -e "${YELLOW}Warning: Not logged in to Docker registry${NC}"
    echo -e "${YELLOW}You will need to login before pushing:${NC}"
    echo -e "  docker login"
fi

# Use existing builder or create new one
echo -e "\n${YELLOW}Setting up Docker buildx...${NC}"
if docker buildx ls | grep -q "multiplatform"; then
    docker buildx use multiplatform
else
    docker buildx create --name multiplatform --driver docker-container --use
fi

# Inspect builder to ensure it's ready
docker buildx inspect --bootstrap

echo -e "\n${BLUE}Building images for all platforms...${NC}"

# Build main Dockerfile
echo -e "\n${YELLOW}Building from Dockerfile...${NC}"
docker buildx build \
    --platform ${PLATFORMS} \
    --tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest \
    --tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:stable \
    --tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION} \
    --push \
    -f Dockerfile \
    .

# Build Dockerfile.multi (optimized version)
echo -e "\n${YELLOW}Building from Dockerfile.multi (optimized)...${NC}"
docker buildx build \
    --platform ${PLATFORMS} \
    --tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest-multi \
    --tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:stable-multi \
    --tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}-multi \
    --push \
    -f Dockerfile.multi \
    .

echo -e "\n${BLUE}======================================${NC}"
echo -e "${GREEN}✅ Successfully built and pushed!${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${YELLOW}Images pushed:${NC}"
echo -e "  ${GREEN}${DOCKER_REGISTRY}/${IMAGE_NAME}:latest${NC}"
echo -e "  ${GREEN}${DOCKER_REGISTRY}/${IMAGE_NAME}:stable${NC}"
echo -e "  ${GREEN}${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}${NC}"
echo -e "  ${GREEN}${DOCKER_REGISTRY}/${IMAGE_NAME}:latest-multi${NC}"
echo -e "  ${GREEN}${DOCKER_REGISTRY}/${IMAGE_NAME}:stable-multi${NC}"
echo -e "  ${GREEN}${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}-multi${NC}"
echo -e "${BLUE}======================================${NC}"