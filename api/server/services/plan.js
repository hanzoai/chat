const { resolveTenantBearer } = require('@hanzochat/api');

/**
 * The plan a caller is on, asked of the service that decides it.
 *
 * Cloud's `GET /v1/allowance` names the plan a caller resolves to and what it
 * lets them do without paying: commerce derives the name from their
 * subscriptions, and an account that has bought nothing derives `free`. Chat
 * reads that answer instead of forming a second opinion from a balance or a
 * subscription row — two answers to "is this person on the free tier" is how a
 * free account came to be offered a model it cannot pay for.
 *
 * The caller's own IAM bearer is forwarded, so the plan that comes back belongs
 * to the person who asked: the same identity the gateway bills.
 */

/** The plan an account holds until it buys one. */
const FREE = 'free';

/** How long to wait. An in-cluster hop, and a page is worth more than a slow answer. */
const TIMEOUT = 3000;

/**
 * The caller's plan name, or null when it could not be read.
 *
 * NULL IS NOT FREE. A caller whose plan did not answer keeps whatever a paying
 * caller gets, so no failure of this read can hand the free lane to someone
 * cloud never named.
 *
 * @param {import('express').Request} req
 * @returns {Promise<string|null>}
 */
async function planOf(req) {
  const bearer = resolveTenantBearer(req);
  const cloud = (process.env.HANZO_CLOUD_URL || '').replace(/\/+$/, '');
  if (!bearer || !cloud) {
    return null;
  }
  try {
    const resp = await fetch(`${cloud}/v1/allowance`, {
      headers: { Authorization: `Bearer ${bearer}` },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!resp.ok) {
      return null;
    }
    const { plan } = await resp.json();
    return typeof plan === 'string' && plan ? plan : null;
  } catch {
    return null;
  }
}

module.exports = { planOf, FREE };
