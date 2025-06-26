const { EModelEndpoint } = require('@hanzochat/data-provider');

/**
 * Vendor Mode Service
 * Handles white-label deployments with fixed model names and backend routing
 */
class VendorService {
  constructor() {
    this.vendorMode = process.env.VENDOR_MODE === 'true';
    this.vendorName = process.env.VENDOR_NAME || 'Hanzo AI';
    this.vendorModels = {
      default: process.env.VENDOR_MODEL_DEFAULT || 'Hanzo Zen-1',
      pro: process.env.VENDOR_MODEL_PRO || 'Hanzo Zen-1 Pro',
    };
    this.backend = {
      endpoint: process.env.VENDOR_BACKEND_ENDPOINT || 'anthropic',
      apiKey: process.env.VENDOR_BACKEND_API_KEY,
      baseURL: process.env.VENDOR_BACKEND_BASE_URL || 'https://api.hanzo.ai/v1',
      models: {
        default: process.env.VENDOR_BACKEND_MODEL_DEFAULT || 'claude-3-5-sonnet-20241022',
        pro: process.env.VENDOR_BACKEND_MODEL_PRO || 'claude-3-5-opus-latest',
      },
    };
  }

  /**
   * Check if vendor mode is enabled
   */
  isEnabled() {
    return this.vendorMode;
  }

  /**
   * Get vendor configuration
   */
  getConfig() {
    return {
      enabled: this.vendorMode,
      name: this.vendorName,
      models: this.vendorModels,
      hideModelSwitcher: true,
      hideSidePanelParameters: true,
      singleEndpoint: true,
    };
  }

  /**
   * Get available models for vendor mode
   */
  getModels() {
    if (!this.vendorMode) {
      return null;
    }

    return [
      {
        id: this.vendorModels.default,
        name: this.vendorModels.default,
        maxTokens: 200000,
        description: 'Fast, efficient AI model for everyday tasks',
      },
      {
        id: this.vendorModels.pro,
        name: this.vendorModels.pro,
        maxTokens: 200000,
        description: 'Advanced AI model for complex reasoning and analysis',
        capabilities: ['advanced-reasoning', 'code-generation', 'complex-analysis'],
      },
    ];
  }

  /**
   * Transform vendor model to actual backend model
   */
  transformModel(vendorModel) {
    if (!this.vendorMode) {
      return vendorModel;
    }

    // Map vendor model names to actual backend models
    if (vendorModel === this.vendorModels.default) {
      return this.backend.models.default;
    } else if (vendorModel === this.vendorModels.pro) {
      return this.backend.models.pro;
    }

    // Default fallback
    return this.backend.models.default;
  }

  /**
   * Get endpoint configuration for vendor mode
   */
  getEndpointConfig() {
    if (!this.vendorMode) {
      return null;
    }

    const endpoint = {
      type: EModelEndpoint.custom,
      name: this.vendorName,
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
          'X-Hanzo-Source': 'vendor-mode',
        };
        break;
    }

    return endpoint;
  }

  /**
   * Transform request for vendor mode
   */
  transformRequest(req) {
    if (!this.vendorMode || !req.body) {
      return req;
    }

    // Transform model in request
    if (req.body.model) {
      req.body.model = this.transformModel(req.body.model);
    }

    // Force endpoint to vendor configuration
    if (req.body.endpoint) {
      req.body.endpoint = this.vendorName;
    }

    // Add vendor headers
    if (!req.headers) {
      req.headers = {};
    }
    req.headers['X-Vendor-Mode'] = 'true';
    req.headers['X-Vendor-Name'] = this.vendorName;

    return req;
  }

  /**
   * Transform response for vendor mode
   */
  transformResponse(response) {
    if (!this.vendorMode || !response) {
      return response;
    }

    // Replace actual model names with vendor model names
    if (response.model) {
      if (response.model === this.backend.models.default) {
        response.model = this.vendorModels.default;
      } else if (response.model === this.backend.models.pro) {
        response.model = this.vendorModels.pro;
      }
    }

    return response;
  }

  /**
   * Get UI configuration for vendor mode
   */
  getUIConfig() {
    if (!this.vendorMode) {
      return {};
    }

    return {
      appTitle: this.vendorName,
      hideEndpointMenu: true,
      hideModelDropdown: true,
      hideSidePanel: false,
      hideAdvancedSettings: true,
      hideApiKeyInput: true,
      brandColor: process.env.VENDOR_BRAND_COLOR || '#000000',
      logoUrl: process.env.VENDOR_LOGO_URL || '/assets/hanzo-logo.svg',
      defaultModel: this.vendorModels.default,
      availableModels: this.getModels(),
    };
  }
}

// Singleton instance
let vendorService;

function getVendorService() {
  if (!vendorService) {
    vendorService = new VendorService();
  }
  return vendorService;
}

module.exports = {
  getVendorService,
  VendorService,
};