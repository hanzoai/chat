/**
 * The client for api.hanzo.ai.
 */
import { createAiClient, type AiClient } from '@hanzo/ai'
import { brand } from '~/brand'
import { iam } from '~/data/iam'

let client: AiClient | null = null

export const ai = (): AiClient =>
  (client ??= createAiClient({
    publishableKey: brand.publishableKey,
    auth: iam(),
    // WHERE the API is and WHO is calling it are separate questions. Pointing
    // the base URL at a local cloud used to drop the bearer with it, so every
    // call to that cloud answered 401 — the one arrangement a local run needs.
    ...(import.meta.env.VITE_HANZO_API
      ? { baseUrl: import.meta.env.VITE_HANZO_API as string }
      : {}),
  }))
