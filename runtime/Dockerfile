# Runtime API Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files from runtime repo
COPY --from=runtime package.json pnpm-lock.yaml* ./
COPY --from=runtime nx.json ./
COPY --from=runtime tsconfig*.json ./
COPY --from=runtime apps/api ./apps/api/
COPY --from=runtime libs ./libs/

# Install dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Build the API
RUN pnpm nx build api

EXPOSE 3000

CMD ["node", "dist/apps/api/main.js"]