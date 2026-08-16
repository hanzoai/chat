import { QUIPS, beats, speaksEnglish } from '../quips';

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
    expect(QUIPS.every((q) => beats(q).length >= 2)).toBe(true);
  });

  it('are distinct, so a rotation does not repeat itself early', () => {
    expect(new Set(QUIPS).size).toBe(QUIPS.length);
  });

  it('open with something short enough to read before the next beat', () => {
    const long = QUIPS.filter((q) => beats(q)[0].length > 48);
    expect(long).toEqual([]);
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
