import { FREE_MODEL, grantConsent } from '@hanzo/ai';
import {
  FREE_CONSENT,
  FREE_OFFERED,
  askConsent,
  offerKeep,
  offerSwitch,
  rememberSwitch,
  type Offer,
} from '../free';

describe('the offer', () => {
  let offered: jest.Mock;
  const kinds = (): Offer[] =>
    offered.mock.calls.map((call) => (call[0] as CustomEvent<{ offer: Offer }>).detail.offer);

  beforeEach(() => {
    window.sessionStorage.clear();
    offered = jest.fn();
    window.addEventListener(FREE_OFFERED, offered);
  });

  afterEach(() => window.removeEventListener(FREE_OFFERED, offered));

  describe('offerKeep — the gateway already answered on free', () => {
    it('offers to keep free when the served model is not the one asked for', () => {
      offerKeep('gpt-5', 'meta-llama/llama-4-scout:free');
      expect(kinds()).toEqual(['keep']);
    });

    it('stays quiet when the model asked for is the model served', () => {
      offerKeep('gpt-5', 'gpt-5');
      expect(offered).not.toHaveBeenCalled();
    });

    it('stays quiet for a conversation already on free — the auto-route always names another model', () => {
      offerKeep(FREE_MODEL, 'meta-llama/llama-4-scout:free');
      expect(offered).not.toHaveBeenCalled();
    });

    it('stays quiet when no model came back', () => {
      offerKeep('gpt-5', undefined);
      expect(offered).not.toHaveBeenCalled();
    });
  });

  describe('offerSwitch — the paid route refused outright', () => {
    it('offers to switch when the paid balance is spent', () => {
      offerSwitch(402, { error: { message: 'no credit', code: 'insufficient_balance' } });
      expect(kinds()).toEqual(['switch']);
    });

    it('offers to switch when every paid provider refused', () => {
      offerSwitch(503, { code: 'providers_exhausted' });
      expect(kinds()).toEqual(['switch']);
    });

    it('offers on a relayed refusal that kept the reason but lost the status', () => {
      offerSwitch(undefined, { needCredits: true });
      expect(kinds()).toEqual(['switch']);
    });

    /* What `checkBalance` throws when the balance will not cover the turn. It
       carries no gateway code and, on the pre-stream path, no status either, so
       the shared predicate cannot see it — and this is the case a signed-in
       visitor actually meets. */
    it('offers to switch on a spent balance this server refused', () => {
      offerSwitch(undefined, {
        type: 'token_balance',
        balance: 0,
        tokenCost: 1200,
        promptTokens: 300,
      });
      expect(kinds()).toEqual(['switch']);
    });

    it('offers to switch when commerce says the balance is short', () => {
      offerSwitch(402, { type: 'token_balance', reason: 'commerce_insufficient' });
      expect(kinds()).toEqual(['switch']);
    });

    it('offers to switch when the tier forbids the model — free is one it allows', () => {
      offerSwitch(402, { type: 'token_balance', reason: 'model_not_allowed', tier: 'free' });
      expect(kinds()).toEqual(['switch']);
    });

    /* The refusal reaches the errored-reply path as JSON inside text, which is
       the form `Error` renders. Same refusal, so the same offer. */
    it('reads the refusal out of a text body', () => {
      offerSwitch(undefined, {
        text: JSON.stringify({ type: 'token_balance', balance: 0, tokenCost: 900 }),
      });
      expect(kinds()).toEqual(['switch']);
    });

    /* A statusless refusal is read here, so this is where the distinction lives:
       commerce being unreachable means the balance could not be READ, not that
       it is empty, and a model swap is not the answer to that. A 402 is a
       different claim and `paidUnavailable` answers it on the status alone. */
    it('stays quiet when the balance could not be read — that is not a spent one', () => {
      offerSwitch(undefined, { type: 'token_balance', reason: 'commerce_unavailable' });
      expect(offered).not.toHaveBeenCalled();
    });

    it('stays quiet on a spent guest quota — that wants a sign-in', () => {
      offerSwitch(402, { type: 'GUEST_LIMIT' });
      expect(offered).not.toHaveBeenCalled();
    });

    /* The free lane's own ceiling, which arrives as the same 402 a paid outage
       does. Offering free to someone refused BY free resends on the route that
       just said no; what they are owed is the plan that lifts the limit. */
    it('stays quiet when the day of free calls is spent — free is what refused', () => {
      offerSwitch(402, { type: 'insufficient_quota', code: 'allowance_spent' });
      expect(offered).not.toHaveBeenCalled();
    });

    it('stays quiet on a spent day nested under error, the shape the gateway sends', () => {
      offerSwitch(402, { error: { message: 'used for today', code: 'allowance_spent' } });
      expect(offered).not.toHaveBeenCalled();
    });

    it('stays quiet on a missing session', () => {
      offerSwitch(401, { message: 'Unauthorized' });
      expect(offered).not.toHaveBeenCalled();
    });

    it.each([400, 429, 500])('stays quiet on %i — free does not clear it', (status) => {
      offerSwitch(status, { message: 'nope' });
      expect(offered).not.toHaveBeenCalled();
    });
  });

  it('makes no offer once this session already settled on free', () => {
    rememberSwitch();
    offerSwitch(402, { code: 'insufficient_balance' });
    offerKeep('gpt-5', 'meta-llama/llama-4-scout:free');
    expect(offered).not.toHaveBeenCalled();
  });
});

describe('askConsent', () => {
  let asked: jest.Mock;

  beforeEach(() => {
    window.localStorage.clear();
    asked = jest.fn();
    window.addEventListener(FREE_CONSENT, asked);
  });

  afterEach(() => window.removeEventListener(FREE_CONSENT, asked));

  it('holds the work and asks when no consent is on record', () => {
    const proceed = jest.fn();
    askConsent(proceed);

    expect(proceed).not.toHaveBeenCalled();
    expect(asked).toHaveBeenCalled();

    const held = (asked.mock.calls[0][0] as CustomEvent<{ proceed: () => void }>).detail.proceed;
    held();
    expect(proceed).toHaveBeenCalled();
  });

  it('runs the work without asking when consent is already on record', () => {
    grantConsent(window.localStorage);
    const proceed = jest.fn();
    askConsent(proceed);

    expect(proceed).toHaveBeenCalled();
    expect(asked).not.toHaveBeenCalled();
  });
});
