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
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
VERSION=$(grep '"version"' package.json | cut -d '"' -f 4)
BUILD_ONLY="${BUILD_ONLY:-false}"

echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Multi-platform Docker Build Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${YELLOW}Registry: $DOCKER_REGISTRY${NC}"
echo -e "${YELLOW}Image: $IMAGE_NAME${NC}"
echo -e "${YELLOW}Version: $VERSION${NC}"
echo -e "${YELLOW}Platforms: $PLATFORMS${NC}"
echo -e "${YELLOW}Build Only: $BUILD_ONLY${NC}"
echo -e "${BLUE}======================================${NC}"

# Function to test if an image runs successfully
test_image() {
    local image=$1
    local test_name=$2
    
    echo -e "\n${YELLOW}Testing $test_name...${NC}"
    
    # Try to run the image and check if it starts successfully
    if docker run --rm -d --name test-$$ -p 3080:3080 "$image" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Container started successfully${NC}"
        
        # Give it a moment to initialize
        sleep 5
        
        # Check if container is still running
        if docker ps -q -f name=test-$$ > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Container is running${NC}"
            
            # Stop the container
            docker stop test-$$ > /dev/null 2>&1
            echo -e "${GREEN}✓ Container stopped cleanly${NC}"
            return 0
        else
            echo -e "${RED}✗ Container stopped unexpectedly${NC}"
            # Check logs
            docker logs test-$$ 2>&1 | tail -20
            return 1
        fi
    else
        echo -e "${RED}✗ Failed to start container${NC}"
        return 1
    fi
}

# Ensure we're using the multi-platform builder
echo -e "\n${YELLOW}Setting up Docker buildx...${NC}"
docker buildx use cloud-builder 2>/dev/null || docker buildx create --name cloud-builder --use

# Build main Dockerfile
echo -e "\n${BLUE}Building from Dockerfile...${NC}"
if [ "$BUILD_ONLY" = "true" ]; then
    # Local build only for testing
    docker buildx build \
        --platform linux/amd64 \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:test-local \
        --load \
        -f Dockerfile \
        .
    
    # Test the local build
    if test_image "$DOCKER_REGISTRY/$IMAGE_NAME:test-local" "Dockerfile (local)"; then
        echo -e "${GREEN}✓ Dockerfile build verified${NC}"
    else
        echo -e "${RED}✗ Dockerfile build failed verification${NC}"
        exit 1
    fi
else
    # Multi-platform build and push
    docker buildx build \
        --platform $PLATFORMS \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:latest \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:stable \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION \
        --push \
        -f Dockerfile \
        .
fi

# Build Dockerfile.multi
echo -e "\n${BLUE}Building from Dockerfile.multi (optimized)...${NC}"
if [ "$BUILD_ONLY" = "true" ]; then
    # Local build only for testing
    docker buildx build \
        --platform linux/amd64 \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:test-local-multi \
        --load \
        -f Dockerfile.multi \
        .
    
    # Test the local build
    if test_image "$DOCKER_REGISTRY/$IMAGE_NAME:test-local-multi" "Dockerfile.multi (local)"; then
        echo -e "${GREEN}✓ Dockerfile.multi build verified${NC}"
    else
        echo -e "${RED}✗ Dockerfile.multi build failed verification${NC}"
        exit 1
    fi
else
    # Multi-platform build and push
    docker buildx build \
        --platform $PLATFORMS \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:latest-multi \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:stable-multi \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION-multi \
        --push \
        -f Dockerfile.multi \
        .
fi

echo -e "\n${BLUE}======================================${NC}"
if [ "$BUILD_ONLY" = "true" ]; then
    echo -e "${GREEN}✅ Local builds completed and verified!${NC}"
    echo -e "${YELLOW}To push to registry, run without BUILD_ONLY=true${NC}"
else
    echo -e "${GREEN}✅ All images built and pushed successfully!${NC}"
    echo -e "${YELLOW}Images pushed:${NC}"
    echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:latest"
    echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:stable"
    echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION"
    echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:latest-multi"
    echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:stable-multi"
    echo -e "  - $DOCKER_REGISTRY/$IMAGE_NAME:$VERSION-multi"
fi
echo -e "${BLUE}======================================${NC}"