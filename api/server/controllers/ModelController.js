const { FREE_MODEL } = require('@hanzo/ai');
const { logger } = require('@hanzochat/data-schemas');
const { CacheKeys } = require('@hanzochat/data-provider');
const { loadDefaultModels, loadConfigModels } = require('~/server/services/Config');
const { buildGuestModelsConfig } = require('~/server/services/guestConfig');
const { planOf, FREE } = require('~/server/services/plan');
const { getLogStores } = require('~/cache');

/**
 * @param {ServerRequest} req
 * @returns {Promise<TModelsConfig>} The models config.
 */
const getModelsConfig = async (req) => {
  const cache = getLogStores(CacheKeys.CONFIG_STORE);
  let modelsConfig = await cache.get(CacheKeys.MODELS_CONFIG);
  if (!modelsConfig) {
    modelsConfig = await loadModels(req);
  }

  return modelsConfig;
};

/**
 * Loads the models from the config.
 * @param {ServerRequest} req - The Express request object.
 * @returns {Promise<TModelsConfig>} The models config.
 */
async function loadModels(req) {
  const cache = getLogStores(CacheKeys.CONFIG_STORE);
  const cachedModelsConfig = await cache.get(CacheKeys.MODELS_CONFIG);
  if (cachedModelsConfig) {
    return cachedModelsConfig;
  }
  const defaultModelsConfig = await loadDefaultModels(req);
  const customModelsConfig = await loadConfigModels(req);

  const modelConfig = { ...defaultModelsConfig, ...customModelsConfig };

  await cache.set(CacheKeys.MODELS_CONFIG, modelConfig);
  return modelConfig;
}

/**
 * The catalog with the free route in front.
 *
 * A conversation opens on the FIRST model its endpoint offers (buildDefaultConvo
 * → parseConvo), and the rung that leads this list is priced — which a free
 * account cannot pay for, so its first message met the wallet gate where an
 * answer belonged. Leading with the route that costs nothing makes the default a
 * model the account can actually run, bounded by the plan's daily allowance
 * rather than by a balance it does not have.
 *
 * REORDERED, NEVER TRIMMED. The priced rungs stay listed and selectable: seeing
 * what a plan buys is the offer, and picking one is how an account asks for it.
 * A guest is narrowed instead, because a guest has no plan to be offered.
 *
 * @param {TModelsConfig} config
 * @returns {TModelsConfig}
 */
const leadFree = (config) =>
  Object.fromEntries(
    Object.entries(config).map(([endpoint, models]) => [
      endpoint,
      Array.isArray(models) && models.includes(FREE_MODEL)
        ? [FREE_MODEL, ...models.filter((model) => model !== FREE_MODEL)]
        : models,
    ]),
  );

async function modelController(req, res) {
  try {
    if (req.user?.guest === true) {
      return res.send(buildGuestModelsConfig());
    }
    const modelConfig = await loadModels(req);
    // The catalog is one list for everyone and is cached as such; which model
    // LEADS it is per-caller, so the plan is read here rather than baked in.
    const plan = await planOf(req);
    res.send(plan === FREE ? leadFree(modelConfig) : modelConfig);
  } catch (error) {
    logger.error('Error fetching models:', error);
    res.status(500).send({ error: error.message });
  }
}

module.exports = { modelController, loadModels, getModelsConfig, leadFree };
