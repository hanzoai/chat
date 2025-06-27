#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Default values
REGISTRY=${REGISTRY:-docker.io}
ORG=${ORG:-hanzoai}
TAG=${1:-}
PUSH_LATEST=${PUSH_LATEST:-true}
PUSH_STABLE=${PUSH_STABLE:-false}

# Function to display usage
usage() {
    echo "Usage: $0 [TAG]"
    echo ""
    echo "Build and push Docker images with smart tagging"
    echo ""
    echo "Arguments:"
    echo "  TAG         Version tag (e.g., v0.7.9). If not provided, only :latest is pushed"
    echo ""
    echo "Environment variables:"
    echo "  REGISTRY    Docker registry (default: docker.io)"
    echo "  ORG         Organization name (default: hanzoai)"
    echo "  PUSH_LATEST Push :latest tag (default: true)"
    echo "  PUSH_STABLE Push :stable tag (default: false, true if TAG provided)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Push only :latest"
    echo "  $0 v0.7.9            # Push :v0.7.9, :latest, and :stable"
    echo "  PUSH_STABLE=true $0  # Push :latest and :stable"
    exit 1
}

# Check if help is requested
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    usage
fi

# If a tag is provided, also push stable
if [[ -n "$TAG" ]]; then
    PUSH_STABLE=true
fi

# Determine registry prefix
if [[ "$REGISTRY" == "docker.io" ]] || [[ "$REGISTRY" == "index.docker.io" ]]; then
    REGISTRY_PREFIX=""
else
    REGISTRY_PREFIX="${REGISTRY}/"
fi

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    Docker Build and Push Script      ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Registry: ${REGISTRY}"
echo "  Organization: ${ORG}"
echo "  Tag: ${TAG:-none}"
echo "  Push latest: ${PUSH_LATEST}"
echo "  Push stable: ${PUSH_STABLE}"
echo ""

# Check Docker login
echo -e "${YELLOW}Checking Docker login...${NC}"
if ! docker info 2>&1 | grep -q "Username:"; then
    echo -e "${RED}Error: Not logged in to Docker registry${NC}"
    echo "Please run: docker login ${REGISTRY}"
    exit 1
fi
echo -e "${GREEN}✓ Logged in to Docker${NC}"
echo ""

# Build function
build_and_push() {
    local image_name=$1
    local dockerfile=$2
    local context=$3
    local base_image="${REGISTRY_PREFIX}${ORG}/${image_name}"
    
    echo -e "${BLUE}Building ${image_name}...${NC}"
    
    # Build the image
    if docker build -f "$dockerfile" -t "${base_image}:latest" "$context"; then
        echo -e "${GREEN}✓ Built ${image_name}${NC}"
    else
        echo -e "${RED}✗ Failed to build ${image_name}${NC}"
        return 1
    fi
    
    # Push latest
    if [[ "$PUSH_LATEST" == "true" ]]; then
        echo -e "${BLUE}Pushing ${base_image}:latest...${NC}"
        if docker push "${base_image}:latest"; then
            echo -e "${GREEN}✓ Pushed ${base_image}:latest${NC}"
        else
            echo -e "${RED}✗ Failed to push ${base_image}:latest${NC}"
            return 1
        fi
    fi
    
    # Tag and push version tag if provided
    if [[ -n "$TAG" ]]; then
        docker tag "${base_image}:latest" "${base_image}:${TAG}"
        echo -e "${BLUE}Pushing ${base_image}:${TAG}...${NC}"
        if docker push "${base_image}:${TAG}"; then
            echo -e "${GREEN}✓ Pushed ${base_image}:${TAG}${NC}"
        else
            echo -e "${RED}✗ Failed to push ${base_image}:${TAG}${NC}"
            return 1
        fi
    fi
    
    # Tag and push stable
    if [[ "$PUSH_STABLE" == "true" ]]; then
        docker tag "${base_image}:latest" "${base_image}:stable"
        echo -e "${BLUE}Pushing ${base_image}:stable...${NC}"
        if docker push "${base_image}:stable"; then
            echo -e "${GREEN}✓ Pushed ${base_image}:stable${NC}"
        else
            echo -e "${RED}✗ Failed to push ${base_image}:stable${NC}"
            return 1
        fi
    fi
    
    echo ""
}

# Build and push chat application
echo -e "${YELLOW}Processing chat application...${NC}"
build_and_push "chat" "Dockerfile" "."

# Build and push RAG API if available
if [[ -d "../rag_api" ]]; then
    echo -e "${YELLOW}Processing chat-rag-api...${NC}"
    build_and_push "chat-rag-api" "../rag_api/Dockerfile" "../rag_api"
else
    echo -e "${YELLOW}Skipping chat-rag-api (source not found)${NC}"
fi

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✅ Docker publish completed!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${BLUE}Published images:${NC}"
echo "  ${REGISTRY_PREFIX}${ORG}/chat:latest"
[[ -n "$TAG" ]] && echo "  ${REGISTRY_PREFIX}${ORG}/chat:${TAG}"
[[ "$PUSH_STABLE" == "true" ]] && echo "  ${REGISTRY_PREFIX}${ORG}/chat:stable"

if [[ -d "../rag_api" ]]; then
    echo "  ${REGISTRY_PREFIX}${ORG}/chat-rag-api:latest"
    [[ -n "$TAG" ]] && echo "  ${REGISTRY_PREFIX}${ORG}/chat-rag-api:${TAG}"
    [[ "$PUSH_STABLE" == "true" ]] && echo "  ${REGISTRY_PREFIX}${ORG}/chat-rag-api:stable"
fi