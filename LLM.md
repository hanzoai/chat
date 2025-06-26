# Hanzo Chat Project - Development Guide

## Project Overview
Hanzo Chat is a chat application based on Chat, which is a platform for interacting with various AI models. The project follows a microservices architecture with several components running in Docker containers.

## Architecture Components

### Backend Services
- **API Service** (Hanzo container): Main application server
- **MongoDB**: Database for storing conversations, users, and other data
- **Meilisearch**: Search engine for indexing and searching content
- **VectorDB**: PostgreSQL with pgvector extension for vector embeddings
- **RAG API**: Service for Retrieval Augmented Generation capabilities

### Project Structure
- `/api`: Backend server code
  - `/app`: Application logic, clients, and integrations
  - `/cache`: Caching mechanisms
  - `/config`: Configuration settings
  - `/models`: Database schemas and models
  - `/server`: Routes, controllers, and middleware
  - `/strategies`: Authentication strategies
- `/client`: Frontend application
  - `/src`: React components, hooks, and UI elements
  - `/public`: Static assets
- `/config`: Configuration scripts and utilities
- `/packages`: Shared packages and modules
  - `/data-provider`: Data fetching and state management
  - `/data-schemas`: Schema definitions
  - `/mcp`: Message control/processing

## Environment Setup

### Prerequisites
- Docker and Docker Compose
- Node.js (version specified in package.json)

### Development Environment
- The application runs in Docker containers
- Storage configuration:
  - Named volumes for databases and service data: `mongodb_data`, `meili_data`, `pgdata2`
  - Local directories mounted for application data: `/images`, `/uploads`, `/logs`

### Important Environment Variables
- `PORT`: The port on which the API service runs (default: 3080)
- `RAG_PORT`: Port for the RAG API service (default: 8000)
- `MEILI_MASTER_KEY`: Key for Meilisearch

## Development Workflow

### Starting the Application
1. Ensure proper directory structure (images, uploads, logs directories)
2. Use docker-compose.override.yml to set specific container configurations:
   ```yaml
   services:
     api:
       user: "root"
     mongodb:
       user: "root"
     meilisearch:
       user: "root"
     vectordb:
       user: "root"
   ```
3. Run `docker compose up -d` to start all services

### Troubleshooting
- **Permissions Issues**: Use `user: "root"` in docker-compose.override.yml for containers
- **MongoDB Errors**: Check permissions on data directories or use named volumes
- **Container Communication**: Ensure proper networking between containers

## Configuration
- `.env`: Environment variables for application settings
- `docker-compose.yml`: Main service configuration
- `docker-compose.override.yml`: Custom overrides for local development
- `chat.yaml`: Optional configuration file for customizing endpoints

## Features
- Multi-model AI chat interface
- Integration with various AI providers
- Authentication with multiple strategies
- File uploads and processing
- Conversation management
- Search capabilities
- Internationalization support
