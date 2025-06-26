const { EModelEndpoint } = require('@hanzochat/data-provider');
const { getUserKey, checkUserKeyExpiry } = require('~/server/services/UserService');
const { getLLMConfig } = require('~/server/services/Endpoints/anthropic/llm');
const AnthropicClient = require('~/app/clients/AnthropicClient');
const { hasHanzoAPIKey, HANZO_API_BASE_URL } = require('~/server/services/HanzoAPIService');

const initializeClient = async ({ req, res, endpointOption, overrideModel, optionsOnly }) => {
  const { ANTHROPIC_API_KEY, ANTHROPIC_REVERSE_PROXY, PROXY, HANZO_API_KEY } = process.env;
  const expiresAt = req.body.key;
  const isUserProvided = ANTHROPIC_API_KEY === 'user_provided';

  let anthropicApiKey = isUserProvided
    ? await getUserKey({ userId: req.user.id, name: EModelEndpoint.anthropic })
    : ANTHROPIC_API_KEY;

  let reverseProxyUrl = ANTHROPIC_REVERSE_PROXY ?? null;

  // Use Hanzo API if available and user hasn't provided their own key
  if (hasHanzoAPIKey() && !anthropicApiKey) {
    anthropicApiKey = HANZO_API_KEY;
    reverseProxyUrl = HANZO_API_BASE_URL;
  }

  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not provided. Please provide it again.');
  }

  if (expiresAt && isUserProvided) {
    checkUserKeyExpiry(expiresAt, EModelEndpoint.anthropic);
  }

  let clientOptions = {};

  /** @type {undefined | TBaseEndpoint} */
  const anthropicConfig = req.app.locals[EModelEndpoint.anthropic];

  if (anthropicConfig) {
    clientOptions.streamRate = anthropicConfig.streamRate;
    clientOptions.titleModel = anthropicConfig.titleModel;
  }

  /** @type {undefined | TBaseEndpoint} */
  const allConfig = req.app.locals.all;
  if (allConfig) {
    clientOptions.streamRate = allConfig.streamRate;
  }

  if (optionsOnly) {
    clientOptions = Object.assign(
      {
        reverseProxyUrl: reverseProxyUrl,
        proxy: PROXY ?? null,
        modelOptions: endpointOption?.model_parameters ?? {},
      },
      clientOptions,
    );
    if (overrideModel) {
      clientOptions.modelOptions.model = overrideModel;
    }
    return getLLMConfig(anthropicApiKey, clientOptions);
  }

  const client = new AnthropicClient(anthropicApiKey, {
    req,
    res,
    reverseProxyUrl: reverseProxyUrl,
    proxy: PROXY ?? null,
    ...clientOptions,
    ...endpointOption,
  });

  return {
    client,
    anthropicApiKey,
  };
};

module.exports = initializeClient;
