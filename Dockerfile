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

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/images

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3080

# Start the application
CMD ["npm", "run", "backend"]