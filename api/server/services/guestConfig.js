const { createHash } = require('node:crypto');
const { isEnabled } = require('@hanzochat/api');
const { EModelEndpoint } = require('@hanzochat/data-provider');
const guestClientIp = require('~/server/utils/guestClientIp');

const GUEST_ROLE = 'GUEST';
const GUEST_NAME = 'Guest';
const DEFAULT_GUEST_MESSAGE_MAX = 3;
const DEFAULT_GUEST_ENDPOINT = 'Hanzo';
// A guest pays nothing and holds no balance, so the guest model must be one that
// serves at zero cost: a free route (`:free`), not a paid house SKU that draws on
// the deployment's balance. This is the same verified free model @hanzo/ai's
// FREE_MODEL names for a signed-in fallback, so both paths land on one free id.
const DEFAULT_GUEST_MODEL = 'nvidia/nemotron-nano-9b-v2:free';

/**
 * Resolves the guest-chat configuration from the environment.
 * Guest chat is disabled unless `ALLOW_GUEST_CHAT` is explicitly enabled.
 *
 * @returns {{
 *   enabled: boolean,
 *   messageMax: number,
 *   endpoint: string,
 *   model: string,
 * }}
 */
const getGuestConfig = () => {
  const messageMax = Number.parseInt(process.env.GUEST_MESSAGE_MAX, 10);

  return {
    enabled: isEnabled(process.env.ALLOW_GUEST_CHAT),
    messageMax:
      Number.isFinite(messageMax) && messageMax > 0 ? messageMax : DEFAULT_GUEST_MESSAGE_MAX,
    endpoint: process.env.GUEST_ENDPOINT || DEFAULT_GUEST_ENDPOINT,
    model: process.env.GUEST_MODEL || DEFAULT_GUEST_MODEL,
  };
};

/**
 * Builds the ephemeral guest principal for an anonymous request.
 *
 * This is the SINGLE source of truth for the guest `req.user` shape. It is a
 * plain object — never a DB document — so no route ever reads or writes real
 * user data on behalf of a guest. No email, no DB id.
 *
 * The id is derived from the visitor's address rather than handed to them,
 * because a guest holds no credential to present. It has to be STABLE for the
 * length of one exchange: a generation job records the principal that started
 * it, and the reader subscribes to that job on a second request. A fresh id per
 * request would 403 every guest off their own reply.
 *
 * The address is hashed, not stored: the id travels into job metadata and log
 * lines, and an address in either is a record of who visited that nothing here
 * needs. A digest keys the same request to the same guest without keeping that.
 *
 * @param {import('express').Request} req
 * @returns {{ id: string, role: string, name: string, guest: true }}
 */
const buildGuestPrincipal = (req) => ({
  id: `guest_${createHash('sha256').update(guestClientIp(req)).digest('hex').slice(0, 32)}`,
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
  DEFAULT_GUEST_ENDPOINT,
  DEFAULT_GUEST_MODEL,
};
