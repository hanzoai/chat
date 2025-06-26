const { isUserProvided } = require('@hanzochat/api');
const { EModelEndpoint } = require('@hanzochat/data-provider');
const { generateConfig } = require('~/server/utils/handleText');
const { hasHanzoAPIKey, HANZO_API_BASE_URL } = require('../HanzoAPIService');

const {
  OPENAI_API_KEY: openAIApiKey,
  AZURE_ASSISTANTS_API_KEY: azureAssistantsApiKey,
  ASSISTANTS_API_KEY: assistantsApiKey,
  AZURE_API_KEY: azureOpenAIApiKey,
  ANTHROPIC_API_KEY: anthropicApiKey,
  CHATGPT_TOKEN: chatGPTToken,
  PLUGINS_USE_AZURE,
  GOOGLE_KEY: googleKey,
  OPENAI_REVERSE_PROXY,
  AZURE_OPENAI_BASEURL,
  ASSISTANTS_BASE_URL,
  AZURE_ASSISTANTS_BASE_URL,
  HANZO_API_KEY: hanzoApiKey,
} = process.env ?? {};

const useAzurePlugins = !!PLUGINS_USE_AZURE;

const userProvidedOpenAI = useAzurePlugins
  ? isUserProvided(azureOpenAIApiKey)
  : isUserProvided(openAIApiKey);

// Helper to determine if we should use Hanzo API for a given endpoint
const getEndpointConfig = (originalKey, originalBaseURL, endpoint) => {
  const config = generateConfig(originalKey, originalBaseURL, endpoint);
  
  // If Hanzo API key is set and user hasn't provided their own key, use Hanzo API
  if (hasHanzoAPIKey() && (!originalKey || isUserProvided(originalKey))) {
    if (typeof config === 'object') {
      config.baseURL = HANZO_API_BASE_URL;
      config.apiKey = hanzoApiKey;
      config.isHanzoProxy = true;
    }
  }
  
  return config;
};

module.exports = {
  config: {
    openAIApiKey,
    azureOpenAIApiKey,
    useAzurePlugins,
    userProvidedOpenAI,
    googleKey,
    hanzoApiKey,
    [EModelEndpoint.anthropic]: getEndpointConfig(anthropicApiKey, undefined, EModelEndpoint.anthropic),
    [EModelEndpoint.chatGPTBrowser]: generateConfig(chatGPTToken),
    [EModelEndpoint.openAI]: getEndpointConfig(openAIApiKey, OPENAI_REVERSE_PROXY, EModelEndpoint.openAI),
    [EModelEndpoint.azureOpenAI]: generateConfig(azureOpenAIApiKey, AZURE_OPENAI_BASEURL),
    [EModelEndpoint.assistants]: generateConfig(
      assistantsApiKey,
      ASSISTANTS_BASE_URL,
      EModelEndpoint.assistants,
    ),
    [EModelEndpoint.azureAssistants]: generateConfig(
      azureAssistantsApiKey,
      AZURE_ASSISTANTS_BASE_URL,
      EModelEndpoint.azureAssistants,
    ),
    [EModelEndpoint.bedrock]: getEndpointConfig(
      process.env.BEDROCK_AWS_SECRET_ACCESS_KEY ?? process.env.BEDROCK_AWS_DEFAULT_REGION,
      undefined,
      EModelEndpoint.bedrock
    ),
    /* key will be part of separate config */
    [EModelEndpoint.agents]: generateConfig('true', undefined, EModelEndpoint.agents),
  },
};
