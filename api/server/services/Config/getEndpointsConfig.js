const { CacheKeys, EModelEndpoint, orderEndpointsConfig } = require('@hanzochat/data-provider');
const loadDefaultEndpointsConfig = require('./loadDefaultEConfig');
const loadConfigEndpoints = require('./loadConfigEndpoints');
const getLogStores = require('~/cache/getLogStores');
const { getVendorService } = require('../VendorService');

/**
 *
 * @param {ServerRequest} req
 * @returns {Promise<TEndpointsConfig>}
 */
async function getEndpointsConfig(req) {
  const vendorService = getVendorService();
  
  // If vendor mode is enabled, return only the vendor endpoint
  if (vendorService.isEnabled()) {
    const vendorEndpoint = vendorService.getEndpointConfig();
    const vendorConfig = {
      [vendorService.vendorName]: {
        type: vendorEndpoint.type,
        userProvide: false,
        userProvideURL: false,
        order: 0,
        models: vendorService.getModels(),
        iconURL: vendorEndpoint.iconURL,
      }
    };
    return vendorConfig;
  }

  const cache = getLogStores(CacheKeys.CONFIG_STORE);
  const cachedEndpointsConfig = await cache.get(CacheKeys.ENDPOINT_CONFIG);
  if (cachedEndpointsConfig) {
    return cachedEndpointsConfig;
  }

  const defaultEndpointsConfig = await loadDefaultEndpointsConfig(req);
  const customConfigEndpoints = await loadConfigEndpoints(req);

  /** @type {TEndpointsConfig} */
  const mergedConfig = { ...defaultEndpointsConfig, ...customConfigEndpoints };
  if (mergedConfig[EModelEndpoint.assistants] && req.app.locals?.[EModelEndpoint.assistants]) {
    const { disableBuilder, retrievalModels, capabilities, version, ..._rest } =
      req.app.locals[EModelEndpoint.assistants];

    mergedConfig[EModelEndpoint.assistants] = {
      ...mergedConfig[EModelEndpoint.assistants],
      version,
      retrievalModels,
      disableBuilder,
      capabilities,
    };
  }
  if (mergedConfig[EModelEndpoint.agents] && req.app.locals?.[EModelEndpoint.agents]) {
    const { disableBuilder, capabilities, allowedProviders, ..._rest } =
      req.app.locals[EModelEndpoint.agents];

    mergedConfig[EModelEndpoint.agents] = {
      ...mergedConfig[EModelEndpoint.agents],
      allowedProviders,
      disableBuilder,
      capabilities,
    };
  }

  if (
    mergedConfig[EModelEndpoint.azureAssistants] &&
    req.app.locals?.[EModelEndpoint.azureAssistants]
  ) {
    const { disableBuilder, retrievalModels, capabilities, version, ..._rest } =
      req.app.locals[EModelEndpoint.azureAssistants];

    mergedConfig[EModelEndpoint.azureAssistants] = {
      ...mergedConfig[EModelEndpoint.azureAssistants],
      version,
      retrievalModels,
      disableBuilder,
      capabilities,
    };
  }

  if (mergedConfig[EModelEndpoint.bedrock] && req.app.locals?.[EModelEndpoint.bedrock]) {
    const { availableRegions } = req.app.locals[EModelEndpoint.bedrock];
    mergedConfig[EModelEndpoint.bedrock] = {
      ...mergedConfig[EModelEndpoint.bedrock],
      availableRegions,
    };
  }

  const endpointsConfig = orderEndpointsConfig(mergedConfig);

  await cache.set(CacheKeys.ENDPOINT_CONFIG, endpointsConfig);
  return endpointsConfig;
}

/**
 * @param {ServerRequest} req
 * @param {import('@hanzochat/data-provider').AgentCapabilities} capability
 * @returns {Promise<boolean>}
 */
const checkCapability = async (req, capability) => {
  const endpointsConfig = await getEndpointsConfig(req);
  const capabilities = endpointsConfig?.[EModelEndpoint.agents]?.capabilities ?? [];
  return capabilities.includes(capability);
};

module.exports = { getEndpointsConfig, checkCapability };
