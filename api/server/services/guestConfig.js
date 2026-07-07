const { isEnabled } = require('@hanzochat/api');
const { EModelEndpoint } = require('librechat-data-provider');

const GUEST_ROLE = 'GUEST';
const GUEST_NAME = 'Guest';
const DEFAULT_GUEST_MESSAGE_MAX = 3;
const DEFAULT_GUEST_TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const DEFAULT_GUEST_ENDPOINT = 'Hanzo';
const DEFAULT_GUEST_MODEL = 'zen3-nano';
// Free-tier allowlist: the models a guest may use within GUEST_MESSAGE_MAX. The
// first entry is the default when nothing specific is requested. Widen it with
// GUEST_MODELS (CSV) to offer a flagship taste (e.g. `zen4-max,zen3-nano`); a
// requested model OUTSIDE this list is not silently downgraded — it falls through
// to the normal 402→login gate so a deep-link stays honest (paid stays paid).
const DEFAULT_GUEST_MODELS = [DEFAULT_GUEST_MODEL];

/**
 * Resolves the guest-chat configuration from the environment.
 * Guest chat is disabled unless `ALLOW_GUEST_CHAT` is explicitly enabled.
 *
 * @returns {{
 *   enabled: boolean,
 *   messageMax: number,
 *   tokenExpiryMs: number,
 *   endpoint: string,
 *   model: string,
 *   models: string[],
 * }}
 */
const getGuestConfig = () => {
  const messageMax = Number.parseInt(process.env.GUEST_MESSAGE_MAX, 10);
  const tokenExpiryMs = Number.parseInt(process.env.GUEST_TOKEN_EXPIRY, 10);

  const csv = (process.env.GUEST_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const models = csv.length
    ? csv
    : process.env.GUEST_MODEL
      ? [process.env.GUEST_MODEL]
      : DEFAULT_GUEST_MODELS;

  return {
    enabled: isEnabled(process.env.ALLOW_GUEST_CHAT),
    messageMax:
      Number.isFinite(messageMax) && messageMax > 0 ? messageMax : DEFAULT_GUEST_MESSAGE_MAX,
    tokenExpiryMs:
      Number.isFinite(tokenExpiryMs) && tokenExpiryMs > 0
        ? tokenExpiryMs
        : DEFAULT_GUEST_TOKEN_EXPIRY_MS,
    endpoint: process.env.GUEST_ENDPOINT || DEFAULT_GUEST_ENDPOINT,
    model: models[0],
    models,
  };
};

/**
 * Resolves a requested guest model against the free-tier allowlist.
 * - No request           → the default guest model, allowed.
 * - Requested ∈ allowlist → that model, allowed (free taste).
 * - Requested ∉ allowlist → the default model + `allowed:false`, so the caller
 *   gates the requested (paid) model behind login instead of silently serving it.
 *
 * @param {string} [requested]
 * @returns {{ model: string, allowed: boolean, requested: (string|undefined) }}
 */
const resolveGuestModel = (requested) => {
  const { models, model } = getGuestConfig();
  if (!requested) return { model, allowed: true, requested };
  if (models.includes(requested)) return { model: requested, allowed: true, requested };
  return { model, allowed: false, requested };
};

/**
 * Builds the ephemeral guest principal for a verified guest token.
 *
 * This is the SINGLE source of truth for the guest `req.user` shape. It is a
 * plain object — never a DB document — so no route ever reads or writes real
 * user data on behalf of a guest. No email, no DB id.
 *
 * @param {string} id - The synthetic guest id from the token (`guest_<uuid>`).
 * @returns {{ id: string, role: string, name: string, guest: true }}
 */
const buildGuestPrincipal = (id) => ({
  id,
  role: GUEST_ROLE,
  name: GUEST_NAME,
  guest: true,
});

/**
 * Builds the guest-scoped `/v1/chat/user` response: the ephemeral principal only.
 * Mirrors the safe-field shape the client expects (no password/totp/email/db id).
 *
 * @param {{ id: string }} principal
 * @returns {object}
 */
const buildGuestUser = (principal) => ({
  id: principal.id,
  username: GUEST_NAME,
  name: GUEST_NAME,
  role: GUEST_ROLE,
  provider: 'guest',
  emailVerified: false,
  guest: true,
});

/**
 * Builds the guest-scoped endpoints config: ONLY the configured guest endpoint,
 * with no builder/agent/file/preset capabilities. Everything else is omitted so
 * the client cannot surface any other endpoint to a guest.
 *
 * @returns {Record<string, object>}
 */
const buildGuestEndpointsConfig = () => {
  const { endpoint } = getGuestConfig();
  return {
    [endpoint]: {
      type: EModelEndpoint.custom,
      userProvide: false,
      modelDisplayLabel: endpoint,
      order: 0,
    },
  };
};

/**
 * Builds the guest-scoped models config: the single configured guest model under
 * the guest endpoint. The client pins the composer to exactly this one model.
 *
 * @returns {Record<string, string[]>}
 */
const buildGuestModelsConfig = () => {
  const { endpoint, models } = getGuestConfig();
  return {
    [endpoint]: models,
  };
};

module.exports = {
  getGuestConfig,
  resolveGuestModel,
  buildGuestPrincipal,
  buildGuestUser,
  buildGuestEndpointsConfig,
  buildGuestModelsConfig,
  GUEST_ROLE,
  GUEST_NAME,
  DEFAULT_GUEST_MESSAGE_MAX,
  DEFAULT_GUEST_TOKEN_EXPIRY_MS,
  DEFAULT_GUEST_ENDPOINT,
  DEFAULT_GUEST_MODEL,
  DEFAULT_GUEST_MODELS,
};
