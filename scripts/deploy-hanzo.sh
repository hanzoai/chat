#!/bin/bash
# Hanzo AI Chat Stack Deployment Script
# One-command deployment with validation and error handling

set -e  # Exit on error

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.hanzo.yml"
ENV_FILE=".env"
ENV_EXAMPLE=".env.hanzo.example"

# Functions
print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════╗"
    echo "║      Hanzo AI Chat Stack Deployer    ║"
    echo "╚══════════════════════════════════════╝"
    echo -e "${NC}"
}

check_requirements() {
    echo -e "${YELLOW}🔍 Checking requirements...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        echo "Please install Docker from https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        echo "Please install Docker Compose"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker daemon is not running${NC}"
        echo "Please start Docker"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All requirements met${NC}"
}

setup_environment() {
    echo -e "${YELLOW}🔧 Setting up environment...${NC}"
    
    # Create .env if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_EXAMPLE" ]; then
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            echo -e "${GREEN}✅ Created .env from template${NC}"
        else
            echo -e "${RED}❌ No .env.hanzo.example found${NC}"
            exit 1
        fi
    fi
    
    # Check for API keys
    if ! grep -q "ANTHROPIC_API_KEY=sk-" "$ENV_FILE" && \
       ! grep -q "OPENAI_API_KEY=sk-" "$ENV_FILE" && \
       ! grep -q "TOGETHER_API_KEY=" "$ENV_FILE"; then
        echo -e "${RED}❌ No LLM API keys found in .env${NC}"
        echo -e "${YELLOW}Please add at least one of the following to your .env file:${NC}"
        echo "  - ANTHROPIC_API_KEY=sk-ant-..."
        echo "  - OPENAI_API_KEY=sk-..."
        echo "  - TOGETHER_API_KEY=..."
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment configured${NC}"
}

build_images() {
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"
    
    # Build with progress
    docker compose -f "$COMPOSE_FILE" build --progress=plain
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Images built successfully${NC}"
    else
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
}

start_services() {
    echo -e "${YELLOW}🚀 Starting services...${NC}"
    
    # Start services
    docker compose -f "$COMPOSE_FILE" up -d
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Services started${NC}"
    else
        echo -e "${RED}❌ Failed to start services${NC}"
        exit 1
    fi
}

wait_for_health() {
    echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
    
    # Maximum wait time (seconds)
    MAX_WAIT=120
    WAITED=0
    
    while [ $WAITED -lt $MAX_WAIT ]; do
        # Check Hanzo Router health
        if curl -f -s http://localhost:4000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Hanzo Router is healthy${NC}"
            
            # Check Chat health
            if curl -f -s http://localhost:3081/health > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Chat UI is healthy${NC}"
                return 0
            fi
        fi
        
        echo -n "."
        sleep 5
        WAITED=$((WAITED + 5))
    done
    
    echo -e "${RED}❌ Services did not become healthy in time${NC}"
    echo "Check logs with: docker compose -f $COMPOSE_FILE logs"
    exit 1
}

test_deployment() {
    echo -e "${YELLOW}🧪 Testing deployment...${NC}"
    
    # Test Hanzo Router API
    echo -n "Testing Hanzo Router API... "
    if curl -s -X POST http://localhost:4000/v1/models \
         -H "Authorization: Bearer sk-hanzo-master-key" | grep -q "data"; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi
    
    # Test Chat UI
    echo -n "Testing Chat UI... "
    if curl -s http://localhost:3081 | grep -q "Hanzo"; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi
}

print_success() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║       🎉 Hanzo AI Chat Stack Deployed! 🎉            ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${BLUE}Access Points:${NC}"
    echo "  • Chat UI:        http://localhost:3081"
    echo "  • Hanzo Router:   http://localhost:4000/v1"
    echo "  • Router Admin:   http://localhost:4000/ui"
    echo "  • API Docs:       http://localhost:4000/docs"
    echo ""
    echo -e "${BLUE}Default Credentials:${NC}"
    echo "  • Master Key:     sk-hanzo-master-key"
    echo ""
    echo -e "${BLUE}Management:${NC}"
    echo "  • View logs:      docker compose -f $COMPOSE_FILE logs -f"
    echo "  • Stop services:  docker compose -f $COMPOSE_FILE down"
    echo "  • Check status:   make -f Makefile.hanzo status"
    echo ""
}

# Main execution
main() {
    print_banner
    check_requirements
    setup_environment
    build_images
    start_services
    wait_for_health
    test_deployment
    print_success
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --quick        Skip building images (use existing)"
        echo "  --clean        Clean up before deploying"
        echo ""
        exit 0
        ;;
    --quick)
        print_banner
        check_requirements
        setup_environment
        start_services
        wait_for_health
        test_deployment
        print_success
        ;;
    --clean)
        echo -e "${YELLOW}🧹 Cleaning up...${NC}"
        docker compose -f "$COMPOSE_FILE" down -v
        main
        ;;
    *)
        main
        ;;
esac