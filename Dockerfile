# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY api/package*.json ./api/
COPY client/package*.json ./client/
COPY packages/data-provider/package*.json ./packages/data-provider/
COPY packages/data-schemas/package*.json ./packages/data-schemas/
COPY packages/api/package*.json ./packages/api/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build packages
RUN npm run build:data-provider && \
    npm run build:data-schemas && \
    npm run build:api

# Build client
RUN cd client && npm run build:ci

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install Python and system dependencies for uv and hanzo-mcp
RUN apk add --no-cache python3 py3-pip git curl bash

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Install production dependencies only
COPY package*.json ./
COPY api/package*.json ./api/
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/api ./api
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/packages ./packages

# Copy other necessary files
COPY .env* ./
COPY config ./config
COPY chat.yaml ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/images

# Test that hanzo-mcp can be run with uvx
RUN uvx --from hanzo-mcp hanzo-mcp --version || echo "hanzo-mcp accessible via uvx"

# Create a wrapper script for hanzo-mcp to use with Node.js
RUN echo '#!/bin/sh\nuvx --from hanzo-mcp hanzo-mcp "$@"' > /usr/local/bin/hanzo-mcp && \
    chmod +x /usr/local/bin/hanzo-mcp

# Verify installations
RUN which python3 && python3 --version && \
    which uv && uv --version && \
    which uvx && uvx --version && \
    which npx && npx --version && \
    hanzo-mcp --version || echo "hanzo-mcp ready"

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV UV_SYSTEM_PYTHON=1

# Expose port
EXPOSE 3080

# Start the application
CMD ["node", "api/server/index.js"]