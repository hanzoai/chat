import { GENERAL, POOLS, beats, poolFor, quipFor, speaksEnglish } from '../quips';

/** Every quip the app can show — the general pool and every topic pool. The
 *  invariants below are about QUIPS, not about which list one happens to be in,
 *  so a new pool inherits them instead of being exempt from them. */
const ALL = [...GENERAL, ...POOLS.flatMap((p) => p.quips)];

describe('beats', () => {
  it('splits a quip on its ellipses', () => {
    expect(beats('Sharpening the answer... too sharp... adding a safety cap... ready.')).toEqual([
      'Sharpening the answer',
      'too sharp',
      'adding a safety cap',
      'ready.',
    ]);
  });

  it('keeps a beat that is only a number, which one quip depends on', () => {
    // "Loading wisdom... 10%... 30%... 97%... stuck at 97% for dramatic effect."
    expect(beats('Loading wisdom... 10%... 30%... 97%... stuck.')).toHaveLength(5);
  });

  it('yields one beat for a quip with no ellipsis, rather than none', () => {
    expect(beats('Done.')).toEqual(['Done.']);
  });
});

describe('the quips themselves', () => {
  it('all have a beat to land on', () => {
    expect(ALL.every((q) => beats(q).length >= 2)).toBe(true);
  });

  it('are distinct, so a rotation does not repeat itself early', () => {
    expect(new Set(ALL).size).toBe(ALL.length);
  });

  it('open with something short enough to read before the next beat', () => {
    const long = ALL.filter((q) => beats(q)[0].length > 48);
    expect(long).toEqual([]);
  });

  /**
   * THE HONESTY RULE, and it is the one that matters.
   *
   * This text is comic filler drawn beside a spinner. It does not know whether
   * a search ran, code executed or a file was opened — and chat really does all
   * three, so a quip that names one of them is indistinguishable from a real
   * status line. A reader has no way to tell a joke about searching from a
   * report that a search happened.
   *
   * Absurdity is fine and is the whole point ("the oracle has bad Wi-Fi"): no
   * one reads that as a progress report. What is banned is the narrow set of
   * phrases that collide with a tool this product actually has.
   */
  it('never claims an action the app actually performs', () => {
    const claims = [
      /search(ing)? the web/i,
      /browsing the/i,
      /running (your |the )?code/i,
      /executing/i,
      /reading your (file|document|attachment)/i,
      /calling (a|the) (tool|api)/i,
      /querying the database/i,
    ];
    const liars = ALL.filter((q) => claims.some((c) => c.test(q)));
    expect(liars).toEqual([]);
  });
});

describe('picking a quip for the prompt', () => {
  it('matches the topic pools it advertises', () => {
    expect(poolFor('why does this typescript function throw')).toBe(
      POOLS.find((p) => p.name === 'code')?.quips,
    );
    expect(poolFor('write me a poem about rain')).toBe(
      POOLS.find((p) => p.name === 'write')?.quips,
    );
    expect(poolFor('compare postgres versus sqlite')).toBe(
      POOLS.find((p) => p.name === 'compare')?.quips,
    );
  });

  it('falls back to the general pool, which is most prompts', () => {
    expect(poolFor('tell me something about otters')).toBe(GENERAL);
    expect(poolFor('')).toBe(GENERAL);
    expect(poolFor(undefined)).toBe(GENERAL);
    expect(poolFor('   ')).toBe(GENERAL);
  });

  /**
   * Only the TAIL is matched, and this is the case that motivates it: a pasted
   * stack trace followed by "write me a haiku about it" is a request to write,
   * not a request about code. Matching the whole prompt lets any paste decide
   * the joke.
   */
  it('reads the end of a long prompt, where the actual request lives', () => {
    const paste = 'TypeError: undefined is not a function\n'.repeat(60);
    expect(poolFor(paste + 'anyway, write me a poem about it')).toBe(
      POOLS.find((p) => p.name === 'write')?.quips,
    );
  });

  it('always returns a quip from the pool it chose', () => {
    const code = POOLS.find((p) => p.name === 'code')!.quips;
    for (let i = 0; i < 25; i++) {
      expect(code).toContain(quipFor('there is a bug in my python'));
    }
    expect(GENERAL).toContain(quipFor('hello'));
  });
});

describe('speaksEnglish', () => {
  it('accepts the regional tags i18next actually reports', () => {
    expect(speaksEnglish('en')).toBe(true);
    expect(speaksEnglish('en-US')).toBe(true);
    expect(speaksEnglish('EN-GB')).toBe(true);
  });

  it('refuses everything else, including an absent language', () => {
    // These turn on wordplay, and a translated pun is not the pun — a UI in
    // another language gets the plain indicator rather than English.
    expect(speaksEnglish('ja')).toBe(false);
    expect(speaksEnglish('fr-CA')).toBe(false);
    expect(speaksEnglish(undefined)).toBe(false);
    expect(speaksEnglish('')).toBe(false);
  });
});
