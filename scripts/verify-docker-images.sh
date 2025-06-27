#!/bin/bash

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

echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Docker Image Verification${NC}"
echo -e "${BLUE}======================================${NC}"

# Function to test an image
test_image() {
    local image=$1
    local name=$2
    
    echo -e "\n${YELLOW}Testing ${name}...${NC}"
    echo -e "Image: ${BLUE}${image}${NC}"
    
    # Pull the image
    echo -n "Pulling image... "
    if docker pull "${image}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
    
    # Get image info
    echo -n "Checking image size... "
    SIZE=$(docker images "${image}" --format "{{.Size}}")
    echo -e "${GREEN}${SIZE}${NC}"
    
    # Run container test
    echo -n "Starting container... "
    CONTAINER_ID=$(docker run -d --rm -p 3080:3080 "${image}" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC}"
        
        # Wait for startup
        echo -n "Waiting for startup... "
        sleep 10
        
        # Check if still running
        if docker ps -q -f id="${CONTAINER_ID}" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
            
            # Stop container
            docker stop "${CONTAINER_ID}" > /dev/null 2>&1
            echo -e "${GREEN}✓ Container verified successfully${NC}"
            return 0
        else
            echo -e "${RED}✗${NC}"
            echo "Container logs:"
            docker logs "${CONTAINER_ID}" 2>&1 | tail -20
            return 1
        fi
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

# Test all image variants
IMAGES=(
    "${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
    "${DOCKER_REGISTRY}/${IMAGE_NAME}:stable"
    "${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}"
    "${DOCKER_REGISTRY}/${IMAGE_NAME}:latest-multi"
    "${DOCKER_REGISTRY}/${IMAGE_NAME}:stable-multi"
    "${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}-multi"
)

NAMES=(
    "Latest"
    "Stable"
    "Version ${VERSION}"
    "Latest (Multi-stage)"
    "Stable (Multi-stage)"
    "Version ${VERSION} (Multi-stage)"
)

FAILED=0
for i in "${!IMAGES[@]}"; do
    if ! test_image "${IMAGES[$i]}" "${NAMES[$i]}"; then
        FAILED=$((FAILED + 1))
    fi
done

echo -e "\n${BLUE}======================================${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All images verified successfully!${NC}"
else
    echo -e "${RED}✗ ${FAILED} images failed verification${NC}"
    exit 1
fi
echo -e "${BLUE}======================================${NC}"