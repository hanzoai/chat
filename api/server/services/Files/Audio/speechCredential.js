const { extractEnvVariable } = require('@hanzochat/data-provider');
const { resolveTenantBearer, OPENID_BEARER_SENTINEL } = require('@hanzochat/api');

/**
 * Resolves the credential a speech request travels on, and the tenant headers that
 * belong with it.
 *
 * Speech is billed exactly like a completion, because it IS a completion as far as
 * the wallet is concerned: api.hanzo.ai/v1/audio/* resolves its caller through IAM
 * and meters the account that caller names. So the rule cannot be a second rule —
 * this defers to the same sentinel, the same resolver and the same header the
 * custom-endpoint path already uses (packages/api endpoints/custom/initialize).
 *
 *   `{{CHAT_OPENID_TOKEN}}` -> the signed-in user's own IAM bearer, so the turn
 *                              bills THEIR account, plus X-Org-Id for the org they
 *                              have switched to. A shared key here would bill every
 *                              user's speech to one wallet.
 *   anything else           -> the literal value (or ${VAR} from the environment),
 *                              which is how a self-hosted OpenAI/Azure key still works.
 *
 * Signed out, or a bearer that has aged out, yields NO credential. That is the
 * honest answer rather than quietly spending someone else's balance: the caller
 * surfaces it, and @hanzo/voice reports the refusal and hands back to the browser
 * recogniser instead of absorbing it.
 *
 * @param {string} configured - The apiKey as written in the speech config.
 * @param {Object} [req] - The request, carrying the session the bearer lives in.
 * @returns {{ apiKey: string, tenantHeaders: Record<string, string> }}
 */
function resolveSpeechCredential(configured, req) {
  if (configured !== OPENID_BEARER_SENTINEL) {
    return { apiKey: extractEnvVariable(configured) || '', tenantHeaders: {} };
  }

  const bearer = req ? resolveTenantBearer(req) : null;
  if (!bearer) {
    return { apiKey: '', tenantHeaders: {} };
  }

  // Only meaningful alongside the bearer whose membership the gateway checks it
  // against, so it never travels on its own.
  const activeOrg = req?.user?.activeOrg || req?.headers?.['x-org-id'];
  return {
    apiKey: bearer,
    tenantHeaders: activeOrg ? { 'X-Org-Id': String(activeOrg) } : {},
  };
}

module.exports = { resolveSpeechCredential };
