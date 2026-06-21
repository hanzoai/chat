const { isEnabled } = require('@hanzochat/api');

const GUEST_ROLE = 'GUEST';
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

module.exports = {
  getGuestConfig,
  GUEST_ROLE,
  DEFAULT_GUEST_MESSAGE_MAX,
  DEFAULT_GUEST_TOKEN_EXPIRY_MS,
  DEFAULT_GUEST_ENDPOINT,
  DEFAULT_GUEST_MODEL,
};
