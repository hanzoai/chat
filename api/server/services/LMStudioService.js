const axios = require('axios');
const { logger } = require('@hanzochat/data-schemas');

const LM_STUDIO_DEFAULT_PORT = 1234;
const LM_STUDIO_BASE_URL = `http://localhost:${LM_STUDIO_DEFAULT_PORT}/v1`;

/**
 * Check if LM Studio is running locally
 * @returns {Promise<boolean>} Whether LM Studio is accessible
 */
async function isLMStudioRunning() {
  try {
    const response = await axios.get(`${LM_STUDIO_BASE_URL}/models`, {
      timeout: 2000, // 2 second timeout for local check
    });
    return response.status === 200;
  } catch (_error) {
    return false;
  }
}

/**
 * Get available models from LM Studio
 * @returns {Promise<string[]>} Array of model names
 */
async function getLMStudioModels() {
  try {
    const response = await axios.get(`${LM_STUDIO_BASE_URL}/models`, {
      timeout: 5000,
    });

    if (response.data && response.data.data) {
      return response.data.data.map((model) => model.id);
    }
    return [];
  } catch (error) {
    logger.debug('Failed to fetch LM Studio models:', error.message);
    return [];
  }
}

/**
 * Create LM Studio endpoint configuration
 * @returns {Promise<Object|null>} LM Studio endpoint config or null if not available
 */
async function createLMStudioEndpoint() {
  const isRunning = await isLMStudioRunning();

  if (!isRunning) {
    return null;
  }

  const models = await getLMStudioModels();

  // Default models if none are loaded in LM Studio
  const defaultModels = [
    'lmstudio-community/Qwen2.5-7B-Instruct-GGUF',
    'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
    'TheBloke/Llama-2-7B-Chat-GGUF',
  ];

  return {
    name: 'LM Studio',
    apiKey: 'lm-studio', // Dummy key for LM Studio
    baseURL: LM_STUDIO_BASE_URL,
    models: {
      default: models.length > 0 ? models : defaultModels,
      fetch: true,
    },
    titleModel: models.length > 0 ? models[0] : defaultModels[0],
    titleConvo: true,
    modelDisplayLabel: 'LM Studio',
    // Custom icon for LM Studio
    iconURL: '/assets/lmstudio-icon.svg',
  };
}

module.exports = {
  isLMStudioRunning,
  getLMStudioModels,
  createLMStudioEndpoint,
};
