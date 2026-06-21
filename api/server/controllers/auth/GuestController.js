const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { logger } = require('@librechat/data-schemas');
const { getGuestConfig, GUEST_ROLE } = require('~/server/services/guestConfig');

/**
 * Issues a short-lived guest token for anonymous preview chat.
 *
 * The token is signed with `JWT_SECRET` and carries a `guest: true` claim plus a
 * per-token random id, so guest principals are ephemeral and isolated from each
 * other. It is rejected by the standard `jwt` strategy (no matching DB user),
 * which keeps every non-chat route closed to guests.
 *
 * @param {ServerRequest} req
 * @param {ServerResponse} res
 */
const guestTokenController = async (req, res) => {
  const config = getGuestConfig();

  if (!config.enabled) {
    return res.status(404).json({ message: 'Guest chat is not enabled' });
  }

  if (!process.env.JWT_SECRET) {
    logger.error('[guestTokenController] JWT_SECRET is not configured');
    return res.status(500).json({ message: 'Server misconfiguration' });
  }

  const id = `guest_${randomUUID()}`;
  const expiresInSeconds = Math.floor(config.tokenExpiryMs / 1000);

  const token = jwt.sign({ id, guest: true, role: GUEST_ROLE }, process.env.JWT_SECRET, {
    expiresIn: expiresInSeconds,
  });

  return res.status(200).json({
    token,
    expiresIn: expiresInSeconds,
    endpoint: config.endpoint,
    model: config.model,
    messageMax: config.messageMax,
  });
};

module.exports = { guestTokenController };
