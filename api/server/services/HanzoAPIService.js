const { logger } = require('@hanzochat/data-provider');

const HANZO_API_BASE_URL = 'https://api.hanzo.ai/v1';

/**
 * Check if Hanzo API key is configured
 * @returns {boolean} Whether Hanzo API key is available
 */
function hasHanzoAPIKey() {
  return !!process.env.HANZO_API_KEY;
}

/**
 * Get Hanzo API configuration
 * @returns {Object|null} Hanzo API configuration or null if not configured
 */
function getHanzoAPIConfig() {
  if (!hasHanzoAPIKey()) {
    return null;
  }

  return {
    apiKey: process.env.HANZO_API_KEY,
    baseURL: HANZO_API_BASE_URL,
  };
}

/**
 * Get available models from Hanzo API
 * @returns {Promise<Array>} Array of available models
 */
async function getHanzoModels() {
  const config = getHanzoAPIConfig();
  if (!config) {
    return [];
  }

  try {
    const axios = require('axios');
    const response = await axios.get(`${HANZO_API_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      timeout: 5000,
    });

    if (response.data && response.data.data) {
      return response.data.data.map((model) => ({
        id: model.id,
        name: model.id,
        provider: model.provider || 'hanzo',
      }));
    }
    return [];
  } catch (error) {
    logger.debug('Failed to fetch Hanzo API models:', error.message);
    return [];
  }
}

/**
 * Create Hanzo API endpoint configuration for a specific provider
 * @param {string} provider - Provider name (e.g., 'openai', 'anthropic')
 * @param {Object} models - Models configuration
 * @returns {Object|null} Endpoint configuration or null if not available
 */
function createHanzoEndpoint(provider, models = {}) {
  const config = getHanzoAPIConfig();
  if (!config) {
    return null;
  }

  return {
    name: provider,
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    models: models,
    titleModel: models.default?.[0] || null,
    titleConvo: true,
    isHanzoProxy: true,
  };
}

/**
 * Should use Hanzo API for this endpoint
 * @param {string} endpoint - Endpoint name
 * @param {Object} envConfig - Environment configuration for the endpoint
 * @returns {boolean} Whether to use Hanzo API
 */
function shouldUseHanzoAPI(endpoint, envConfig = {}) {
  // If no Hanzo API key, don't use it
  if (!hasHanzoAPIKey()) {
    return false;
  }

  // If user has provided their own API key for this endpoint, respect it
  if (envConfig.apiKey && !envConfig.apiKey.includes('user_provided')) {
    return false;
  }

  // Otherwise, use Hanzo API
  return true;
}

module.exports = {
  hasHanzoAPIKey,
  getHanzoAPIConfig,
  getHanzoModels,
  createHanzoEndpoint,
  shouldUseHanzoAPI,
  HANZO_API_BASE_URL,
};
