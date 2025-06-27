const axios = require('axios');
const { logger } = require('@hanzochat/data-schemas');

const OLLAMA_DEFAULT_PORT = 11434;
const OLLAMA_BASE_URL = `http://localhost:${OLLAMA_DEFAULT_PORT}`;

/**
 * Check if Ollama is running locally
 * @returns {Promise<boolean>} Whether Ollama is accessible
 */
async function isOllamaRunning() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 2000, // 2 second timeout for local check
    });
    return response.status === 200;
  } catch (_error) {
    return false;
  }
}

/**
 * Get available models from Ollama
 * @returns {Promise<string[]>} Array of model names
 */
async function getOllamaModels() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000,
    });

    if (response.data && response.data.models) {
      return response.data.models.map((model) => model.name);
    }
    return [];
  } catch (error) {
    logger.debug('Failed to fetch Ollama models:', error.message);
    return [];
  }
}

/**
 * Create Ollama endpoint configuration
 * @returns {Promise<Object|null>} Ollama endpoint config or null if not available
 */
async function createOllamaEndpoint() {
  const isRunning = await isOllamaRunning();

  if (!isRunning) {
    return null;
  }

  const models = await getOllamaModels();

  // Default models if none are pulled in Ollama
  const defaultModels = ['llama3.2', 'llama3.1', 'qwen2.5-coder', 'gemma2', 'mistral'];

  return {
    name: 'Ollama',
    apiKey: 'ollama', // Dummy key for Ollama
    baseURL: `${OLLAMA_BASE_URL}/v1`,
    models: {
      default: models.length > 0 ? models : defaultModels,
      fetch: true,
    },
    titleModel: models.length > 0 ? models[0] : defaultModels[0],
    titleConvo: true,
    modelDisplayLabel: 'Ollama (Local)',
    iconURL: '/assets/ollama-icon.svg',
  };
}

module.exports = {
  isOllamaRunning,
  getOllamaModels,
  createOllamaEndpoint,
  OLLAMA_BASE_URL,
};
