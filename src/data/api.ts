/**
 * The addresses this client states for itself, and there are four.
 *
 * Everything else it talks to is `@hanzo/ai`'s — the SDK owns the base URL and
 * every route under it, so a path to api.hanzo.ai does not appear in this repo
 * at all. That is the point of the move: the table this file used to be listed
 * sixty addresses under `/v1/chat/*`, a route family no server serves, and each
 * one was a place for a client and a gateway to disagree.
 *
 * What is left is what no SDK can know: where the ISSUER'S two full-page trips
 * go, and where this app's own doorway is. Both are navigations rather than
 * requests — the browser leaves — so neither can be a method call.
 */
import { brand, clientId } from '../brand'

export const api = {
  /**
   * The issuer, for the two trips the IAM SDK does not make. Everything else it
   * resolves from discovery, and writing those out here would be a second copy
   * of what the issuer already publishes — one that can drift from it.
   */
  iam: {
    signup: `${brand.issuer}/signup/${clientId}`,
    account: `${brand.issuer}/account`,
  },
  /**
   * The brand's own public pages. Not the SDK's, and not this app's — and each
   * is `undefined` for a brand that has not stated one, so a caller draws the
   * link or does not rather than sending that brand's reader to another's.
   */
  plans: brand.site ? `${brand.site}/pricing` : undefined,
  docs: brand.docs,
  billing: brand.billing,
} as const

/** Where a refusal sends a visitor who has to sign in. */
export const loginPath = '/login'

/** Where the issuer returns one. */
export const callbackPath = '/auth/callback'
