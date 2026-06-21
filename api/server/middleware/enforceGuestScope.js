const { logger } = require('@librechat/data-schemas');
const { EModelEndpoint } = require('librechat-data-provider');
const { getGuestConfig } = require('~/server/services/guestConfig');

/**
 * Server-side capability scope for guest principals.
 *
 * Runs after guest authentication and before `buildEndpointOption`. For guest
 * requests it pins the endpoint and model to the configured free Zen endpoint and
 * strips every capability a guest must not reach (paid models, agents, tools,
 * files, model specs, presets). The client is never trusted: any guest request
 * that names a different endpoint/model is rejected rather than silently rewritten.
 *
 * Non-guest requests pass through untouched.
 *
 * @param {ServerRequest} req
 * @param {ServerResponse} res
 * @param {import('express').NextFunction} next
 */
const enforceGuestScope = (req, res, next) => {
  if (req.user?.guest !== true) {
    return next();
  }

  const config = getGuestConfig();
  if (!config.enabled) {
    return res.status(404).json({ message: 'Guest chat is not enabled' });
  }

  const body = req.body || {};
  const { endpoint, model } = body;

  if (endpoint != null && endpoint !== config.endpoint) {
    logger.warn(`[enforceGuestScope] Guest ${req.user.id} rejected endpoint: ${endpoint}`);
    return res.status(403).json({ message: 'Guests may only use the free preview model' });
  }

  if (model != null && model !== config.model) {
    logger.warn(`[enforceGuestScope] Guest ${req.user.id} rejected model: ${model}`);
    return res.status(403).json({ message: 'Guests may only use the free preview model' });
  }

  body.endpoint = config.endpoint;
  body.endpointType = EModelEndpoint.custom;
  body.model = config.model;

  delete body.agent_id;
  delete body.spec;
  delete body.preset;
  delete body.files;
  delete body.tools;
  delete body.tool_resources;
  delete body.resendFiles;
  delete body.promptPrefix;
  delete body.web_search;

  req.body = body;
  return next();
};

module.exports = enforceGuestScope;
