# Re-tag LibreChat RAG API as Hanzo Chat RAG API
# This is a temporary solution until we have our own RAG API implementation

FROM ghcr.io/hanzoai/librechat-rag-api-dev-lite:latest

# Add Hanzo branding
LABEL org.opencontainers.image.title="Hanzo Chat RAG API"
LABEL org.opencontainers.image.description="RAG API for Hanzo Chat"
LABEL org.opencontainers.image.vendor="Hanzo AI"
LABEL org.opencontainers.image.source="https://github.com/hanzoai/chat"

# The base image already has all the necessary setup
# We're just rebranding it for now