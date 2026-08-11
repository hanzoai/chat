// file deepcode ignore HardcodedNonCryptoSecret: No hardcoded secrets
import { useAtomValue } from 'jotai';
import { ViolationTypes, ErrorTypes, alternateName } from '@hanzochat/data-provider';
import type { LocalizeFunction } from '~/common';
import { formatJSON, extractJson, isJson } from '~/utils/json';
import { IAM_SIGNUP_URL } from '~/utils/iam';
import { useLocalize } from '~/hooks';
import store from '~/store';
import CodeBlock from './CodeBlock';

const localizedErrorPrefix = 'com_error';

type TConcurrent = {
  limit: number;
};

type TMessageLimit = {
  max: number;
  windowInMinutes: number;
};

type TTokenBalance = {
  type: ViolationTypes | ErrorTypes;
  balance: number;
  tokenCost: number;
  promptTokens: number;
  prev_count: number;
  violation_count: number;
  date: Date;
  generations?: unknown[];
  reason?: string;
  tier?: string;
  allowedModels?: string[];
};

type TExpiredKey = {
  expiredAt: string;
  endpoint: string;
};

type TGenericError = {
  info: string;
};

const errorMessages = {
  [ErrorTypes.MODERATION]: 'com_error_moderation',
  [ErrorTypes.NO_USER_KEY]: 'com_error_no_user_key',
  [ErrorTypes.INVALID_USER_KEY]: 'com_error_invalid_user_key',
  [ErrorTypes.NO_BASE_URL]: 'com_error_no_base_url',
  [ErrorTypes.INVALID_ACTION]: `com_error_${ErrorTypes.INVALID_ACTION}`,
  [ErrorTypes.INVALID_REQUEST]: `com_error_${ErrorTypes.INVALID_REQUEST}`,
  [ErrorTypes.REFUSAL]: 'com_error_refusal',
  [ErrorTypes.MISSING_MODEL]: (json: TGenericError, localize: LocalizeFunction) => {
    const { info: endpoint } = json;
    const provider = (alternateName[endpoint ?? ''] as string | undefined) ?? endpoint ?? 'unknown';
    return localize('com_error_missing_model', { 0: provider });
  },
  [ErrorTypes.EXPIRED_BEARER]: 'com_error_expired_bearer',
  [ErrorTypes.MODELS_NOT_LOADED]: 'com_error_models_not_loaded',
  [ErrorTypes.ENDPOINT_MODELS_NOT_LOADED]: (json: TGenericError, localize: LocalizeFunction) => {
    const { info: endpoint } = json;
    const provider = (alternateName[endpoint ?? ''] as string | undefined) ?? endpoint ?? 'unknown';
    return localize('com_error_endpoint_models_not_loaded', { 0: provider });
  },
  [ErrorTypes.NO_SYSTEM_MESSAGES]: `com_error_${ErrorTypes.NO_SYSTEM_MESSAGES}`,
  [ErrorTypes.EXPIRED_USER_KEY]: (json: TExpiredKey, localize: LocalizeFunction) => {
    const { expiredAt, endpoint } = json;
    return localize('com_error_expired_user_key', { 0: endpoint, 1: expiredAt });
  },
  [ErrorTypes.INPUT_LENGTH]: (json: TGenericError, localize: LocalizeFunction) => {
    const { info } = json;
    return localize('com_error_input_length', { 0: info });
  },
  [ErrorTypes.INVALID_AGENT_PROVIDER]: (json: TGenericError, localize: LocalizeFunction) => {
    const { info } = json;
    const provider = (alternateName[info] as string | undefined) ?? info;
    return localize('com_error_invalid_agent_provider', { 0: provider });
  },
  [ErrorTypes.GOOGLE_ERROR]: (json: TGenericError) => {
    const { info } = json;
    return info;
  },
  [ErrorTypes.GOOGLE_TOOL_CONFLICT]: 'com_error_google_tool_conflict',
  [ViolationTypes.BAN]:
    'Your account has been temporarily banned due to violations of our service.',
  [ViolationTypes.ILLEGAL_MODEL_REQUEST]: (json: TGenericError, localize: LocalizeFunction) => {
    const { info } = json;
    const [endpoint, model = 'unknown'] = info?.split('|') ?? [];
    const provider = (alternateName[endpoint ?? ''] as string | undefined) ?? endpoint ?? 'unknown';
    return localize('com_error_illegal_model_request', { 0: model, 1: provider });
  },
  invalid_api_key:
    'Invalid API key. Please check your API key and try again. You can do this by clicking on the model logo in the left corner of the textbox and selecting "Set Token" for the current selected endpoint. Thank you for your understanding.',
  /**
   * OUR credential, not the reader's — and not a paywall.
   *
   * IAM answers `key_unknown` for a key it does not hold, the gateway relays it
   * (hanzoai/ai v1.832.44), and `server/utils/refusal.js` keeps it distinct from
   * a spent balance. Both arrive as 402, so without that separation this
   * rendered the add-credit link: it told a reader to buy credit for a
   * credential no payment restores. Nothing the reader owns is wrong, so this
   * offers no action to them and does not send them to billing — it says who is
   * at fault, which is the only honest thing a service can say about its own
   * broken key. `invalid_api_key` above stays as it is: that one IS a key the
   * reader set.
   */
  key_unknown:
    'This service’s API credential is not valid, so the request could not be sent. Nothing is wrong with your account and no credit has been used. This is a server-side problem on our end and has been logged.',
  /**
   * The stream broke AFTER it began — the gateway committed to text/event-stream
   * and then an upstream route dropped (surfaced by `hanzoGatewayFetch`). The
   * balance was already cleared, so this is transient, not a paywall: nothing the
   * reader owns is wrong and a resend usually succeeds. It offers the action, not
   * an apology, and is distinct from `key_unknown` (our credential) and
   * `insufficient_quota` (a real paywall).
   */
  upstream_error:
    'The response was interrupted before it finished. Nothing is wrong with your account and this has been logged — please send your message again.',
  /**
   * A PAYWALL, not a failure. The gateway answers a request it cannot bill with
   * 402, and `server/utils/refusal.js` names that `insufficient_quota` — the same
   * name `hanzoGatewayFetch` already gives a spent balance. The one thing that
   * resolves it is credit, so the render is an action, not an apology.
   *
   * It used to read "the default API key has reached its limit … set up your own
   * API key", which is upstream's advice for a self-hosted key. There is no key to
   * set on hanzo.chat; the money lives at billing.hanzo.ai.
   */
  insufficient_quota: (_json: unknown, localize: LocalizeFunction) => (
    <>
      {localize('com_error_insufficient_quota')}
      <br />
      <br />
      <a
        href="https://billing.hanzo.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-hanzo-red underline"
      >
        {localize('com_error_add_credit')}
      </a>
    </>
  ),
  concurrent: (json: TConcurrent) => {
    const { limit } = json;
    const plural = limit > 1 ? 's' : '';
    return `Only ${limit} message${plural} at a time. Please allow any other responses to complete before sending another message, or wait one minute.`;
  },
  message_limit: (json: TMessageLimit) => {
    const { max, windowInMinutes } = json;
    const plural = max > 1 ? 's' : '';
    return `You hit the message limit. You have a cap of ${max} message${plural} per ${
      windowInMinutes > 1 ? `${windowInMinutes} minutes` : 'minute'
    }.`;
  },
  token_balance: (json: TTokenBalance, _localize?: unknown, isAuthenticated?: boolean) => {
    const { balance, tokenCost, promptTokens, generations, reason, tier, allowedModels } = json;

    // Model not allowed for this tier
    if (reason === 'model_not_allowed') {
      const tierName = tier || 'free';
      const models = allowedModels?.join(', ') || 'basic models';
      return (
        <>
          {`This model is not available on the ${tierName} tier. Available models: ${models}.`}
          <br />
          <br />
          <a
            href="https://billing.hanzo.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-hanzo-red underline"
          >
            Upgrade your plan
          </a>
        </>
      );
    }

    // Commerce insufficient balance. There is NO starter credit — that offer is
    // retired (billing requires a payment method and a plan), so this must never
    // advertise free money it cannot grant. Add funds or pick a plan, both at
    // billing.hanzo.ai.
    if (reason === 'commerce_insufficient') {
      // Signed out: the door is sign-up, not top-up — a visitor with no account
      // has no balance to add and would dead-end at a billing page for an
      // account that doesn't exist.
      if (isAuthenticated !== true) {
        return (
          <>
            {'Sign up to start chatting with Hanzo — every account comes with credits.'}
            <br />
            <br />
            <a
              href={IAM_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-hanzo-red underline"
            >
              Sign up free
            </a>
          </>
        );
      }
      return (
        <>
          {'You have no Hanzo Cloud balance. Add funds or choose a plan to start chatting.'}
          <br />
          <br />
          <a
            href="https://billing.hanzo.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-hanzo-red underline"
          >
            Add funds at billing.hanzo.ai
          </a>
        </>
      );
    }

    // Commerce unreachable — fail closed (we block rather than bleed). The user
    // may well be funded; do NOT tell them to add funds.
    if (reason === 'commerce_unavailable') {
      return 'Billing is temporarily unavailable, so we could not verify your balance. Please try again in a moment.';
    }

    // Convert tokenCredits to USD: 1,000,000 tokenCredits = $1 USD
    const balanceUsd = (balance / 1000000).toFixed(4);
    const costUsd = (tokenCost / 1000000).toFixed(4);
    const message = `Insufficient balance. Your balance is $${balanceUsd} USD, but this request costs $${costUsd} USD (${promptTokens} prompt tokens). Please add funds to continue.`;
    return (
      <>
        {message}
        <br />
        <br />
        <a
          href="https://billing.hanzo.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-hanzo-red underline"
        >
          Add funds to your Hanzo account
        </a>
        {generations && (
          <>
            <br />
            <br />
          </>
        )}
        {generations && (
          <CodeBlock
            lang="Generations"
            error={true}
            codeChildren={formatJSON(JSON.stringify(generations))}
          />
        )}
      </>
    );
  },
};

/**
 * A refused request carries no answer, only the reason. Passport answers an
 * unauthenticated request with the bare body `Unauthorized`, which must never
 * reach the reader as "the specific error message we encountered" — say plainly
 * that they are not signed in instead.
 */
const isUnauthorized = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().replace(/^"|"$/g, '').toLowerCase() === 'unauthorized';

const Error = ({ text }: { text: string }) => {
  const localize = useLocalize();
  // A refusal offers the door the visitor can actually walk through: a
  // signed-out person has no balance to top up, they have an account to make.
  const isAuthenticated = useAtomValue(store.isAuthenticated);
  const jsonString = extractJson(text);

  /**
   * The fallback is a HUMAN SENTENCE, never the upstream body.
   *
   * This used to be `…the specific error message we encountered: ${text}`, which
   * made every unmapped shape a leak. Two shipped that way — Passport's bare
   * `Unauthorized`, then a gateway `402 a billable tenant is required (no
   * anonymous usage)` — because the mapping below enumerates known shapes and
   * production keeps inventing new ones. Enumerating is fine for the cases that
   * genuinely say something different to the reader; what has to change is where
   * the enumeration MISSES. Unrecognised now degrades to a sentence, and the raw
   * text stays available to whoever is debugging — useResumableSSE already logs
   * the failure verbatim, so nothing is lost by not repeating it here (and a
   * console call in render would fire on every re-render anyway).
   */
  const defaultResponse = localize('com_error_unknown');

  if (isUnauthorized(text)) {
    return localize('com_error_unauthorized');
  }

  if (!isJson(jsonString)) {
    return defaultResponse;
  }

  const json = JSON.parse(jsonString);
  if (isUnauthorized(json) || isUnauthorized(json?.message) || isUnauthorized(json?.error)) {
    return localize('com_error_unauthorized');
  }
  /**
   * The code, wherever the producer put it. An OpenAI-shaped body nests it under
   * `error` (`{error:{code,type}}`), and reading only the top level is how a
   * gateway 402 arrived carrying its reason and still rendered as
   * `com_error_unknown`.
   */
  const errorKey = json.code || json.type || json.error?.code || json.error?.type;
  const keyExists = errorKey && errorMessages[errorKey];

  if (keyExists && typeof errorMessages[errorKey] === 'function') {
    return errorMessages[errorKey](json, localize, isAuthenticated);
  } else if (keyExists && keyExists.startsWith(localizedErrorPrefix)) {
    return localize(errorMessages[errorKey]);
  } else if (keyExists) {
    return errorMessages[errorKey];
  } else {
    return defaultResponse;
  }
};

export default Error;
