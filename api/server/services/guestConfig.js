const { isEnabled } = require('@hanzochat/api');
const { EModelEndpoint } = require('librechat-data-provider');

const GUEST_ROLE = 'GUEST';
const GUEST_NAME = 'Guest';
const DEFAULT_GUEST_MESSAGE_MAX = 3;
const DEFAULT_GUEST_TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const DEFAULT_GUEST_ENDPOINT = 'Hanzo';
const DEFAULT_GUEST_MODEL = 'zen3-nano';

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
 * }}
 */
const getGuestConfig = () => {
  const messageMax = Number.parseInt(process.env.GUEST_MESSAGE_MAX, 10);
  const tokenExpiryMs = Number.parseInt(process.env.GUEST_TOKEN_EXPIRY, 10);

  return {
    enabled: isEnabled(process.env.ALLOW_GUEST_CHAT),
    messageMax:
      Number.isFinite(messageMax) && messageMax > 0 ? messageMax : DEFAULT_GUEST_MESSAGE_MAX,
    tokenExpiryMs:
      Number.isFinite(tokenExpiryMs) && tokenExpiryMs > 0
        ? tokenExpiryMs
        : DEFAULT_GUEST_TOKEN_EXPIRY_MS,
    endpoint: process.env.GUEST_ENDPOINT || DEFAULT_GUEST_ENDPOINT,
    model: process.env.GUEST_MODEL || DEFAULT_GUEST_MODEL,
  };
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
 * Builds the guest-scoped `/api/user` response: the ephemeral principal only.
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
  const { endpoint, model } = getGuestConfig();
  return {
    [endpoint]: [model],
  };
};

module.exports = {
  getGuestConfig,
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
};
