const { EModelEndpoint } = require('@hanzochat/data-provider');

/**
 * Brand Mode Service
 * Handles white-label deployments with fixed model names and backend routing
 */
class BrandService {
  constructor() {
    this.brandMode = process.env.BRAND_MODE === 'true';
    this.brandName = process.env.BRAND_NAME || 'Hanzo AI';
    this.brandModels = {
      default: process.env.BRAND_MODEL_DEFAULT || 'Hanzo Zen-1',
      pro: process.env.BRAND_MODEL_PRO || 'Hanzo Zen-1 Pro',
    };
    this.backend = {
      endpoint: process.env.BRAND_BACKEND_ENDPOINT || 'anthropic',
      apiKey: process.env.BRAND_BACKEND_API_KEY,
      baseURL: process.env.BRAND_BACKEND_BASE_URL || 'https://api.hanzo.ai/v1',
      models: {
        default: process.env.BRAND_BACKEND_MODEL_DEFAULT || 'claude-3-5-sonnet-20241022',
        pro: process.env.BRAND_BACKEND_MODEL_PRO || 'claude-3-5-opus-latest',
      },
    };
  }

  /**
   * Check if brand mode is enabled
   */
  isEnabled() {
    return this.brandMode;
  }

  /**
   * Get brand configuration
   */
  getConfig() {
    return {
      enabled: this.brandMode,
      name: this.brandName,
      models: this.brandModels,
      hideModelSwitcher: true,
      hideSidePanelParameters: true,
      singleEndpoint: true,
    };
  }

  /**
   * Get available models for brand mode
   */
  getModels() {
    if (!this.brandMode) {
      return null;
    }

    return [
      {
        id: this.brandModels.default,
        name: this.brandModels.default,
        maxTokens: 200000,
        description: 'Fast, efficient AI model for everyday tasks',
      },
      {
        id: this.brandModels.pro,
        name: this.brandModels.pro,
        maxTokens: 200000,
        description: 'Advanced AI model for complex reasoning and analysis',
        capabilities: ['advanced-reasoning', 'code-generation', 'complex-analysis'],
      },
    ];
  }

  /**
   * Transform brand model to actual backend model
   */
  transformModel(brandModel) {
    if (!this.brandMode) {
      return brandModel;
    }

    // Map brand model names to actual backend models
    if (brandModel === this.brandModels.default) {
      return this.backend.models.default;
    } else if (brandModel === this.brandModels.pro) {
      return this.backend.models.pro;
    }

    // Default fallback
    return this.backend.models.default;
  }

  /**
   * Get endpoint configuration for brand mode
   */
  getEndpointConfig() {
    if (!this.brandMode) {
      return null;
    }

    const endpoint = {
      type: EModelEndpoint.custom,
      name: this.brandName,
      apiKey: this.backend.apiKey,
      baseURL: this.backend.baseURL,
      models: {
        default: this.getModels(),
        fetch: false, // Don't fetch models from API
      },
      iconURL: '/assets/hanzo-logo.svg',
      userProvide: false, // Don't allow users to provide their own key
      userProvideURL: false,
      order: 0, // Show first
    };

    // Configure based on backend type
    switch (this.backend.endpoint) {
      case 'openAI':
        endpoint.type = EModelEndpoint.openAI;
        break;
      case 'anthropic':
        endpoint.type = EModelEndpoint.anthropic;
        break;
      case 'hanzoai':
        endpoint.type = EModelEndpoint.custom;
        endpoint.headers = {
          'X-Hanzo-Source': 'brand-mode',
        };
        break;
    }

    return endpoint;
  }

  /**
   * Transform request for brand mode
   */
  transformRequest(req) {
    if (!this.brandMode || !req.body) {
      return req;
    }

    // Transform model in request
    if (req.body.model) {
      req.body.model = this.transformModel(req.body.model);
    }

    // Force endpoint to brand configuration
    if (req.body.endpoint) {
      req.body.endpoint = this.brandName;
    }

    // Add brand headers
    if (!req.headers) {
      req.headers = {};
    }
    req.headers['X-Brand-Mode'] = 'true';
    req.headers['X-Brand-Name'] = this.brandName;

    return req;
  }

  /**
   * Transform response for brand mode
   */
  transformResponse(response) {
    if (!this.brandMode || !response) {
      return response;
    }

    // Replace actual model names with brand model names
    if (response.model) {
      if (response.model === this.backend.models.default) {
        response.model = this.brandModels.default;
      } else if (response.model === this.backend.models.pro) {
        response.model = this.brandModels.pro;
      }
    }

    return response;
  }

  /**
   * Get UI configuration for brand mode
   */
  getUIConfig() {
    if (!this.brandMode) {
      return {};
    }

    return {
      appTitle: this.brandName,
      hideEndpointMenu: true,
      hideModelDropdown: true,
      hideSidePanel: false,
      hideAdvancedSettings: true,
      hideApiKeyInput: true,
      brandColor: process.env.BRAND_COLOR || '#000000',
      logoUrl: process.env.BRAND_LOGO_URL || '/assets/hanzo-logo.svg',
      defaultModel: this.brandModels.default,
      availableModels: this.getModels(),
    };
  }
}

// Singleton instance
let brandService;

function getBrandService() {
  if (!brandService) {
    brandService = new BrandService();
  }
  return brandService;
}

module.exports = {
  getBrandService,
  BrandService,
};
