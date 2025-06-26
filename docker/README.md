# Hanzo Chat Docker Configuration

This directory contains all Docker-related configurations for Hanzo Chat.

## Files

- `docker-compose.yml` - Base configuration
- `docker-compose.override.yml` - Local development overrides  
- `docker-compose.prod.yml` - Production configuration with Traefik
- `docker-compose.dev.yml` - Development configuration with source mounting

## Usage

### Local Development
```bash
cd docker
docker compose up -d
```

### Production Deployment
```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Development with Live Reload
```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Network

All services run on the `hanzo-network` Docker network to allow integration with other Hanzo services.

## Volumes

- MongoDB data: `mongodb_data`
- Meilisearch data: `meilisearch_data`
- Vector DB data: `vectordb_data`
- Uploads: `./uploads`
- Images: `./images`
- Logs: `./logs`