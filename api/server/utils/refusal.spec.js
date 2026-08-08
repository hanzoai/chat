const { ErrorTypes } = require('@hanzochat/data-provider');
const { INSUFFICIENT_QUOTA, KEY_UNKNOWN, refusalCode, refusalText } = require('./refusal');

/**
 * The defect this pins, measured live: a signed-in user with money to give us
 * asked `enso` a question, the gateway answered 402, and the message stored for
 * the thread was
 *
 *   {"type":"error","error":"An error occurred while processing the request: 402 invalid API key"}
 *
 * — prose, with the status and the code thrown away. `Messages/Content/Error.tsx`
 * dispatches on a CODE, so it rendered as "Something went wrong on our side".
 * The reason was known at the throw the whole time.
 *
 * CORRECTED once the cause was measured: that 402 was never a paywall. The user
 * had money — the message says so — and the gateway said `invalid API key`
 * because IAM did not hold the key (`key_unknown`). Reading the STATUS and
 * ignoring the SENTENCE is what turned a broken credential into a request for
 * payment. So this fixture is the CREDENTIAL case, and `spentBalance402` below
 * is the paywall; the two share a status and must not share a code.
 */
const GENERIC = 'An error occurred while processing your request. Please contact the Admin.';

/** What the OpenAI client raises for a gateway 402 (langchain re-throws it as-is). */
const gateway402 = () => Object.assign(new Error('402 invalid API key'), { status: 402 });

/** A 402 that money actually resolves — the balance gate, not the credential. */
const spentBalance402 = () =>
  Object.assign(new Error('402 insufficient balance for this request'), { status: 402 });

describe('refusalCode', () => {
  it('names a bare gateway 402 by its status alone', () => {
    expect(refusalCode(spentBalance402())).toBe(INSUFFICIENT_QUOTA);
  });

  it('names an invalid-key 402 for the credential it is, not the paywall', () => {
    expect(refusalCode(gateway402())).toBe(KEY_UNKNOWN);
  });

  // `ErrorTypes.EXPIRED_BEARER` does not exist, so this asserted undefined ===
  // null and had been failing on main while appearing to cover the rule. A
  // literal names the thing the rule is about: whatever code the thrower chose.
  it('keeps the code the thrower chose', () => {
    const error = Object.assign(new Error('nope'), {
      code: 'expired_bearer',
      status: 403,
    });

    expect(refusalCode(error)).toBe('expired_bearer');
  });

  it('reads the code out of an OpenAI-shaped nested body', () => {
    const error = Object.assign(new Error('402 quota'), {
      status: 402,
      error: { code: 'insufficient_quota', type: 'insufficient_quota' },
    });

    expect(refusalCode(error)).toBe(INSUFFICIENT_QUOTA);
  });

  it('finds the status wherever the thrower left it', () => {
    expect(refusalCode({ response: { status: 402 } })).toBe(INSUFFICIENT_QUOTA);
    expect(refusalCode({ statusCode: 402 })).toBe(INSUFFICIENT_QUOTA);
  });

  it('names nothing for a failure that says nothing', () => {
    expect(refusalCode(new Error('upstream exploded'))).toBeNull();
    expect(refusalCode({ status: 500 })).toBeNull();
    expect(refusalCode(undefined)).toBeNull();
  });
});

describe('refusalText', () => {
  it('turns a gateway 402 into an envelope the client can render', () => {
    const text = refusalText(gateway402(), GENERIC);

    expect(JSON.parse(text)).toEqual({ error: '402 invalid API key', code: KEY_UNKNOWN });
  });

  it('never stores the prose that reached production', () => {
    expect(refusalText(gateway402(), GENERIC)).not.toContain('An error occurred');
  });

  it('keeps an envelope a thrower already built, rather than burying it', () => {
    const built = JSON.stringify({ type: ErrorTypes.NO_USER_KEY });

    expect(refusalText(new Error(built), GENERIC)).toBe(built);
  });

  it('leaves a genuinely unknown failure with the generic sentence', () => {
    expect(refusalText(new Error('upstream exploded'), GENERIC)).toBe(GENERIC);
    expect(refusalText(undefined, GENERIC)).toBe(GENERIC);
  });

  it('does not mistake prose that merely mentions a type for an envelope', () => {
    // The old rule was `message.includes('"type"')`, which this would satisfy.
    const error = new Error('the "type" field was rejected');

    expect(refusalText(error, GENERIC)).toBe(GENERIC);
  });
});

describe('a broken credential is not a paywall', () => {
  const { KEY_UNKNOWN, INSUFFICIENT_QUOTA, refusalCode, refusalText } = require('./refusal');

  // Every gateway key in the cluster resolved to key_unknown at once, and each
  // of those turns rendered the add-credit link. Buying credit cannot restore a
  // key IAM does not hold, so this is the one mapping that must not collapse.
  it('names the gateway prose form key_unknown, not insufficient_quota', () => {
    const err = Object.assign(new Error('API key validation failed: IAM returned status 400'), {
      status: 402,
    });
    expect(refusalCode(err)).toBe(KEY_UNKNOWN);
    expect(refusalCode(err)).not.toBe(INSUFFICIENT_QUOTA);
  });

  // hanzoai/ai v1.832.44 relays IAM's own reason; before it, only the prose
  // above existed. Both must land on the same code so the fix does not depend
  // on which gateway version is deployed.
  it('names the relayed reason key_unknown', () => {
    const err = Object.assign(
      new Error('IAM refused the key: key_unknown (the entity does not exist)'),
      { status: 402 },
    );
    expect(refusalCode(err)).toBe(KEY_UNKNOWN);
  });

  it('still names a real spent balance insufficient_quota', () => {
    const err = Object.assign(new Error('insufficient funds for this request'), { status: 402 });
    expect(refusalCode(err)).toBe(INSUFFICIENT_QUOTA);
  });

  it('leaves an unrelated failure unnamed, so it keeps the caller sentence', () => {
    const err = Object.assign(new Error('upstream exploded'), { status: 500 });
    expect(refusalCode(err)).toBeNull();
    expect(refusalText(err, 'fallback')).toBe('fallback');
  });

  it('stores the code the renderer dispatches on', () => {
    const err = Object.assign(new Error('API key validation failed: IAM returned status 400'), {
      status: 402,
    });
    expect(JSON.parse(refusalText(err, 'fallback')).code).toBe(KEY_UNKNOWN);
  });
});
