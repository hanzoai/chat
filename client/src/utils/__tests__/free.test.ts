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

    it('stays quiet on a spent guest quota — that wants a sign-in', () => {
      offerSwitch(402, { type: 'GUEST_LIMIT' });
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
