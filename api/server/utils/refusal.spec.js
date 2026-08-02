const { ErrorTypes } = require('@hanzochat/data-provider');
const { INSUFFICIENT_QUOTA, refusalCode, refusalText } = require('./refusal');

/**
 * The defect this pins, measured live: a signed-in user with money to give us
 * asked `enso` a question, the gateway answered 402, and the message stored for
 * the thread was
 *
 *   {"type":"error","error":"An error occurred while processing the request: 402 invalid API key"}
 *
 * — prose, with the status and the code thrown away. `Messages/Content/Error.tsx`
 * dispatches on a CODE, so the paywall rendered as "Something went wrong on our
 * side". The reason was known at the throw the whole time.
 */
const GENERIC = 'An error occurred while processing your request. Please contact the Admin.';

/** What the OpenAI client raises for a gateway 402 (langchain re-throws it as-is). */
const gateway402 = () => Object.assign(new Error('402 invalid API key'), { status: 402 });

describe('refusalCode', () => {
  it('names a bare gateway 402 by its status alone', () => {
    expect(refusalCode(gateway402())).toBe(INSUFFICIENT_QUOTA);
  });

  it('keeps the code the thrower chose', () => {
    const error = Object.assign(new Error('nope'), {
      code: ErrorTypes.EXPIRED_BEARER,
      status: 403,
    });

    expect(refusalCode(error)).toBe(ErrorTypes.EXPIRED_BEARER);
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

    expect(JSON.parse(text)).toEqual({ error: '402 invalid API key', code: INSUFFICIENT_QUOTA });
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
