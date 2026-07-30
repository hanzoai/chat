import {
  CacheKeys,
  ErrorTypes,
  envVarRegex,
  FetchTokenConfig,
  extractEnvVariable,
} from '@hanzochat/data-provider';
import type { TEndpoint } from '@hanzochat/data-provider';
import type { AppConfig } from '@hanzochat/data-schemas';
import type { BaseInitializeParams, InitializeResultBase, EndpointTokenConfig } from '~/types';
import { getOpenAIConfig } from '~/endpoints/openai/config';
import { getCustomEndpointConfig } from '~/app/config';
import { fetchModels } from '~/endpoints/models';
import { isUserProvided, checkUserKeyExpiry } from '~/utils';
import { standardCache } from '~/cache';
import { resolveTenantBearer, resolveActiveOrg, OPENID_BEARER_SENTINEL } from './tenantBearer';
import { wrapHanzoGatewayFetch, type GatewayFetch } from './hanzoGatewayFetch';

const { PROXY } = process.env;

/**
 * Builds custom options from endpoint configuration
 */
function buildCustomOptions(
  endpointConfig: Partial<TEndpoint>,
  appConfig?: AppConfig,
  endpointTokenConfig?: Record<string, unknown>,
) {
  const customOptions: Record<string, unknown> = {
    headers: endpointConfig.headers,
    addParams: endpointConfig.addParams,
    dropParams: endpointConfig.dropParams,
    customParams: endpointConfig.customParams,
    titleConvo: endpointConfig.titleConvo,
    titleModel: endpointConfig.titleModel,
    summaryModel: endpointConfig.summaryModel,
    modelDisplayLabel: endpointConfig.modelDisplayLabel,
    titleMethod: endpointConfig.titleMethod ?? 'completion',
    contextStrategy: endpointConfig.summarize ? 'summarize' : null,
    directEndpoint: endpointConfig.directEndpoint,
    titleMessageRole: endpointConfig.titleMessageRole,
    streamRate: endpointConfig.streamRate,
    endpointTokenConfig,
  };

  const allConfig = appConfig?.endpoints?.all;
  if (allConfig) {
    customOptions.streamRate = allConfig.streamRate;
  }

  return customOptions;
}

/**
 * Initializes a custom endpoint client configuration.
 * This function handles custom endpoints defined in chat.yaml, including
 * user-provided API keys and URLs.
 *
 * @param params - Configuration parameters
 * @returns Promise resolving to endpoint configuration options
 * @throws Error if config is missing, API key is not provided, or base URL is missing
 */
export async function initializeCustom({
  req,
  endpoint,
  model_parameters,
  db,
}: BaseInitializeParams): Promise<InitializeResultBase> {
  const appConfig = req.config;
  const { key: expiresAt } = req.body;

  const endpointConfig = getCustomEndpointConfig({
    endpoint,
    appConfig,
  });

  if (!endpointConfig) {
    throw new Error(`Config not found for the ${endpoint} custom endpoint.`);
  }

  const CUSTOM_API_KEY = extractEnvVariable(endpointConfig.apiKey ?? '');
  const CUSTOM_BASE_URL = extractEnvVariable(endpointConfig.baseURL ?? '');

  if (CUSTOM_API_KEY.match(envVarRegex)) {
    throw new Error(`Missing API Key for ${endpoint}.`);
  }

  if (CUSTOM_BASE_URL.match(envVarRegex)) {
    throw new Error(`Missing Base URL for ${endpoint}.`);
  }

  const userProvidesKey = isUserProvided(CUSTOM_API_KEY);
  const userProvidesURL = isUserProvided(CUSTOM_BASE_URL);

  let userValues = null;
  if (expiresAt && (userProvidesKey || userProvidesURL)) {
    checkUserKeyExpiry(expiresAt, endpoint);
    userValues = await db.getUserKeyValues({ userId: req.user?.id ?? '', name: endpoint });
  }

  let apiKey = userProvidesKey ? userValues?.apiKey : CUSTOM_API_KEY;
  const baseURL = userProvidesURL ? userValues?.baseURL : CUSTOM_BASE_URL;

  // Canonical Hanzo Cloud auth+billing: an endpoint that declares
  // `apiKey: "{{CHAT_OPENID_TOKEN}}"` bills the signed-in user's OWN org by
  // forwarding THEIR IAM bearer to cloud (api.hanzo.ai) as the request
  // credential. cloud validates the JWT, pins the tenant org from the verified
  // `owner` claim, and meters the org's shared plan then PAYG — no shared key, no
  // per-user minted key (see AUTH_BILLING_CONTRACT.md in hanzoai/cloud). If no
  // forwardable bearer exists (signed out / expired) we FAIL CLOSED: the user
  // must sign in with Hanzo. There is no fallback credential to spend on.
  // The active org a multi-org member has switched to, forwarded as `X-Org-Id`
  // ONLY on the bearer path — it is meaningful solely alongside the IAM token
  // whose membership the gateway checks it against.
  let tenantHeaders: Record<string, string> | undefined;
  if (apiKey === OPENID_BEARER_SENTINEL) {
    const isGuest = (req.user as { guest?: boolean } | undefined)?.guest === true;
    if (isGuest) {
      // Anonymous guest preview: there is NO IAM identity to forward and NO org to
      // bill. Use the shared, capped guest gateway key — the guest key's OWN org is
      // metered + capped at api.hanzo.ai (402 when exhausted, surfaced by
      // wrapHanzoGatewayFetch below), never a real user's org. Per-user hk- billing
      // is skipped by construction: a guest carries no bearer and no active org, so
      // NO `X-Org-Id` is sent. The guest key never leaves the server. `GUEST_API_KEY`
      // (the KMS `chat-guest-key`) is preferred; `HANZO_API_KEY` is the dev fallback.
      // Fail closed if neither is configured.
      const guestKey = process.env.GUEST_API_KEY || process.env.HANZO_API_KEY || '';
      if (!guestKey) {
        throw new Error('Guest chat is temporarily unavailable.');
      }
      apiKey = guestKey;
    } else {
      const bearer = resolveTenantBearer(
        req as unknown as Parameters<typeof resolveTenantBearer>[0],
      );
      if (!bearer) {
        /**
         * A stale bearer carries a CODE, not just a sentence.
         *
         * This used to throw a bare `new Error('Sign in with Hanzo to chat …')`.
         * The controller turns a throw into `{ error: <message> }`, and a body with
         * no `code` and no `type` is EXACTLY the shape `Messages/Content/Error.tsx`
         * cannot read — so it fell through to `com_error_unknown` and a plain
         * one-hour expiry rendered as "Something went wrong on our side. Please try
         * again in a moment." on every message. The reason was known the whole way
         * up; only its shape was unreadable.
         *
         * It is also not a 401. `requireGuestOrJwtAuth` already admitted this
         * caller, so they ARE signed in and their id_token merely aged out — the
         * client answers 401 by minting a login gate, which would tell a paying
         * customer to sign in when they already are (the distinction
         * routes/askMessage.js draws, kept identical here).
         */
        throw Object.assign(new Error(ErrorTypes.EXPIRED_BEARER), {
          code: ErrorTypes.EXPIRED_BEARER,
          status: 403,
        });
      }
      apiKey = bearer;
      const activeOrg = resolveActiveOrg(req as unknown as Parameters<typeof resolveActiveOrg>[0]);
      if (activeOrg) {
        tenantHeaders = { 'X-Org-Id': activeOrg };
      }
    }
  }

  if (userProvidesKey && !apiKey) {
    throw new Error(
      JSON.stringify({
        type: ErrorTypes.NO_USER_KEY,
      }),
    );
  }

  if (userProvidesURL && !baseURL) {
    throw new Error(
      JSON.stringify({
        type: ErrorTypes.NO_BASE_URL,
      }),
    );
  }

  if (!apiKey) {
    throw new Error(`${endpoint} API key not provided.`);
  }

  if (!baseURL) {
    throw new Error(`${endpoint} Base URL not provided.`);
  }

  let endpointTokenConfig: EndpointTokenConfig | undefined;

  const userId = req.user?.id ?? '';

  const cache = standardCache(CacheKeys.TOKEN_CONFIG);
  /** tokenConfig is an optional extended property on custom endpoints */
  const hasTokenConfig = (endpointConfig as Record<string, unknown>).tokenConfig != null;
  const tokenKey =
    !hasTokenConfig && (userProvidesKey || userProvidesURL) ? `${endpoint}:${userId}` : endpoint;

  const cachedConfig =
    !hasTokenConfig &&
    FetchTokenConfig[endpoint.toLowerCase() as keyof typeof FetchTokenConfig] &&
    (await cache.get(tokenKey));

  endpointTokenConfig = (cachedConfig as EndpointTokenConfig) || undefined;

  if (
    FetchTokenConfig[endpoint.toLowerCase() as keyof typeof FetchTokenConfig] &&
    endpointConfig &&
    endpointConfig.models?.fetch &&
    !endpointTokenConfig
  ) {
    await fetchModels({ apiKey, baseURL, name: endpoint, user: userId, tokenKey });
    endpointTokenConfig = (await cache.get(tokenKey)) as EndpointTokenConfig | undefined;
  }

  const customOptions = buildCustomOptions(endpointConfig, appConfig, endpointTokenConfig);
  if (tenantHeaders) {
    customOptions.headers = {
      ...((customOptions.headers as Record<string, string> | undefined) ?? {}),
      ...tenantHeaders,
    };
  }

  const clientOptions: Record<string, unknown> = {
    reverseProxyUrl: baseURL ?? null,
    proxy: PROXY ?? null,
    ...customOptions,
  };

  const modelOptions = { ...(model_parameters ?? {}), user: userId };
  const finalClientOptions = {
    modelOptions,
    ...clientOptions,
  };

  const options = getOpenAIConfig(apiKey, finalClientOptions, endpoint);
  if (options != null) {
    (options as InitializeResultBase).useLegacyContent = true;
    (options as InitializeResultBase).endpointTokenConfig = endpointTokenConfig;
  }

  // The Hanzo Cloud gateway answers some failures (e.g. a premium model requested
  // against a starter-credit-only balance) with HTTP 200 + a JSON error envelope
  // ({status:"error", msg}) that has no `choices`. Left as-is, the OpenAI client
  // parses the choices-less 200 to `undefined` and the agent run crashes with
  // `Cannot read properties of undefined (reading 'role')` — no reply renders.
  // Wrap the client fetch so that envelope becomes a clean 402 carrying the
  // gateway's actionable message. Scoped to the Hanzo gateway; response-only, so
  // per-user hk- billing is untouched.
  if (options?.configOptions && /(?:^|\.)hanzo\.ai(?::|\/|$)/i.test(baseURL ?? '')) {
    options.configOptions.fetch = wrapHanzoGatewayFetch(
      options.configOptions.fetch as GatewayFetch | undefined,
    );
  }

  const streamRate = clientOptions.streamRate as number | undefined;
  if (streamRate) {
    (options.llmConfig as Record<string, unknown>)._lc_stream_delay = streamRate;
  }

  return options;
}
