"""
Hanzo Cloud integration for the Router.
Handles automatic organization/user linking for API keys created through the cloud dashboard.
"""

import os
from typing import Optional, Dict, Any
from datetime import datetime
import hashlib
from fastapi import Request

from litellm.proxy._types import UserAPIKeyAuth
from litellm.proxy.auth.user_api_key_auth import user_api_key_auth
from litellm.proxy.utils import PrismaClient


class HanzoCloudIntegration:
    """
    Integration layer between Hanzo Cloud and Router.
    Automatically enriches requests with organization and user context.
    """
    
    def __init__(self, prisma_client: Optional[PrismaClient] = None):
        self.prisma_client = prisma_client
        self.services_base_url = os.getenv("HANZO_SERVICES_URL", "http://localhost:3001")
        
    async def enrich_api_key_metadata(self, user_api_key_dict: UserAPIKeyAuth) -> UserAPIKeyAuth:
        """
        Enrich API key metadata with cloud organization and user information.
        This is called after successful API key authentication.
        """
        if not user_api_key_dict.metadata:
            user_api_key_dict.metadata = {}
            
        # Check if this key was created via cloud
        if user_api_key_dict.metadata.get("source") == "hanzo-cloud":
            # Key already has cloud metadata
            return user_api_key_dict
            
        # For keys created directly, try to link them to cloud entities
        # This would typically query the services API to find associations
        # For now, we'll use the metadata if present
        
        return user_api_key_dict
    
    async def sync_usage_to_cloud(self, api_key: str, usage_data: Dict[str, Any]):
        """
        Sync usage data back to the cloud for billing and analytics.
        Called after each successful request completion.
        """
        # Extract organization ID from key metadata
        if self.prisma_client:
            key_data = await self.prisma_client.db.litellm_verificationtoken.find_unique(
                where={"token": api_key}
            )
            
            if key_data and key_data.metadata:
                org_id = key_data.metadata.get("organization_id")
                if org_id:
                    # Send usage data to services
                    # This would typically make an async call to services API
                    pass
    
    async def validate_organization_limits(self, user_api_key_dict: UserAPIKeyAuth) -> bool:
        """
        Check if the organization has exceeded their limits.
        Returns True if the request should proceed, False if it should be blocked.
        """
        if not user_api_key_dict.metadata:
            return True
            
        org_id = user_api_key_dict.metadata.get("organization_id")
        if not org_id:
            return True
            
        # Check organization budget and rate limits
        # This would query the services API or cache
        # For now, always allow
        return True
    
    def create_langfuse_config_for_org(self, user_api_key_dict: UserAPIKeyAuth) -> Dict[str, Any]:
        """
        Create Langfuse configuration based on organization.
        This ensures all requests are tracked per organization automatically.
        """
        metadata = user_api_key_dict.metadata or {}
        org_id = metadata.get("organization_id", "unknown")
        user_id = metadata.get("user_id", "unknown")
        
        # Generate consistent identifiers for Langfuse tracking
        org_hash = hashlib.sha256(org_id.encode()).hexdigest()[:8]
        
        return {
            "langfuse_user_id": f"org-{org_hash}-user-{user_id}",
            "langfuse_session_id": f"session-{org_hash}-{datetime.now().strftime('%Y%m%d')}",
            "langfuse_metadata": {
                "organization_id": org_id,
                "user_id": user_id,
                "team_id": metadata.get("team_id"),
                "source": "hanzo-router",
                "api_key_alias": user_api_key_dict.key_alias,
            }
        }
    
    async def on_request_start(self, request: Request, user_api_key_dict: UserAPIKeyAuth):
        """
        Called when a request starts. Enriches the request with cloud context.
        """
        # Enrich API key metadata
        await self.enrich_api_key_metadata(user_api_key_dict)
        
        # Validate organization limits
        if not await self.validate_organization_limits(user_api_key_dict):
            raise Exception("Organization limits exceeded")
        
        # Inject Langfuse configuration
        langfuse_config = self.create_langfuse_config_for_org(user_api_key_dict)
        
        # Add to request state for later use
        request.state.langfuse_config = langfuse_config
        request.state.cloud_metadata = user_api_key_dict.metadata
    
    async def on_request_complete(self, request: Request, response_data: Dict[str, Any]):
        """
        Called when a request completes. Syncs usage data to cloud.
        """
        if hasattr(request.state, "user_api_key"):
            api_key = request.state.user_api_key
            
            # Extract usage data from response
            usage_data = {
                "model": response_data.get("model"),
                "usage": response_data.get("usage", {}),
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": response_data.get("id"),
            }
            
            # Sync to cloud asynchronously
            await self.sync_usage_to_cloud(api_key, usage_data)


# Global instance
cloud_integration = HanzoCloudIntegration()


async def setup_cloud_integration(app, prisma_client: Optional[PrismaClient] = None):
    """
    Set up cloud integration middleware for the Router.
    """
    global cloud_integration
    cloud_integration.prisma_client = prisma_client
    
    # Add middleware to enrich requests
    @app.middleware("http")
    async def cloud_integration_middleware(request: Request, call_next):
        # Only process API requests
        if request.url.path.startswith("/v1/") or request.url.path.startswith("/chat/"):
            # Get user API key dict if authenticated
            if hasattr(request.state, "user_api_key_dict"):
                await cloud_integration.on_request_start(
                    request, 
                    request.state.user_api_key_dict
                )
        
        response = await call_next(request)
        
        # Process completion
        if hasattr(request.state, "response_data"):
            await cloud_integration.on_request_complete(
                request,
                request.state.response_data
            )
        
        return response
    
    return cloud_integration