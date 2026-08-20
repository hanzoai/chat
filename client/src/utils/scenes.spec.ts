import { SCENES, DAYS, sceneOf, opener } from './scenes';

/**
 * The catalog is DATA, and these are the properties a reader of that data is
 * entitled to assume. They are cheap and they are the ones that break silently:
 * a duplicate id makes a picker show two identical rows, a malformed URL paints
 * nothing, and a missing headline renders an empty h1 over the video.
 */
describe('the curated catalog', () => {
  it('is ten scenes, each uniquely named', () => {
    expect(SCENES).toHaveLength(10);
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(10);
  });

  it('names a distinct video per scene, as an eleven-character YouTube id', () => {
    const ids = SCENES.map((s) => (s.url.match(/v=([\w-]{11})$/) ?? [])[1]);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(10);
  });

  it('gives every scene a headline and a credit', () => {
    for (const s of SCENES) {
      expect(s.headline.trim().length).toBeGreaterThan(0);
      expect(s.credit.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps the reef line, which is the one people know', () => {
    expect(SCENES.find((s) => s.id === 'reef')?.headline).toBe('Explore new worlds.');
  });
});

describe('sceneOf', () => {
  it('finds a scene however the link was copied', () => {
    const reef = SCENES.find((s) => s.id === 'reef')!;
    const id = reef.url.slice(-11);
    for (const form of [reef.url, `https://youtu.be/${id}`, `https://www.youtube.com/embed/${id}`, id]) {
      expect(sceneOf(form)?.id).toBe('reef');
    }
  });

  it('says nothing about footage nobody curated', () => {
    expect(sceneOf('https://www.youtube.com/watch?v=aaaaaaaaaaa')).toBeUndefined();
    expect(sceneOf('')).toBeUndefined();
    expect(sceneOf(null)).toBeUndefined();
    expect(sceneOf(undefined)).toBeUndefined();
  });
});

describe('opener', () => {
  it('is the day, and the first name when there is one', () => {
    expect(opener(4, 'Zach')).toBe('Turn up Thursday, Zach');
    expect(opener(5, 'Ada Lovelace')).toBe('Ship-it Friday, Ada');
  });

  it('drops the comma rather than trailing it, for a visitor with no name', () => {
    for (const nameless of ['', '   ', null, undefined]) {
      expect(opener(4, nameless)).toBe('Turn up Thursday');
    }
  });

  it('covers all seven days, Sunday first because getDay() says so', () => {
    expect(DAYS).toHaveLength(7);
    expect(opener(0)).toBe('Slow Sunday');
    expect(new Set(DAYS).size).toBe(7);
  });

  it('takes any integer a clock can hand it', () => {
    expect(opener(7)).toBe(opener(0));
    expect(opener(-1)).toBe(opener(6));
  });
});
