/**
 * What a visitor who has chosen nothing gets.
 *
 * This value has flipped twice with nothing holding it, and the failure is
 * silent both ways — an `off` default renders a black canvas that looks like a
 * backdrop nobody configured, and an `on` default that ignores a stored `off`
 * looks like a setting that does not work. Neither throws, so only a test
 * notices.
 *
 * DEFAULT_BACKDROP reads localStorage when the module is first evaluated, so
 * every case seeds storage and then imports fresh.
 */
import { createStore } from 'jotai';
import type { Atom } from 'jotai';
import type { Backdrop } from '~/utils/backdrop';

const read = (): Backdrop => {
  jest.resetModules();
  const store = createStore();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const settings = require('../settings').default as { backdrop: Atom<Backdrop> };
  return store.get(settings.backdrop);
};

describe('the backdrop a visitor arrives at', () => {
  beforeEach(() => localStorage.clear());

  it('plays, for anyone who has never touched a setting', () => {
    const backdrop = read();
    expect(backdrop.source).toBe('video');
    expect(backdrop.video).toContain('youtube.com');
  });

  it('arrives silent — playing is ours to choose, noise is not', () => {
    expect(read().sound).toBe(false);
  });

  it('stays off for someone who turned the old switch off', () => {
    localStorage.setItem('showBackdrop', 'false');
    expect(read().source).toBe('off');
  });

  it('stays off for someone who chose off in this release', () => {
    localStorage.setItem('backdrop', JSON.stringify({ source: 'off' }));
    expect(read().source).toBe('off');
  });

  it('keeps footage chosen under the old setting', () => {
    localStorage.setItem('backdropVideo', JSON.stringify('dQw4w9WgXcQ'));
    expect(read()).toMatchObject({ source: 'video', video: 'dQw4w9WgXcQ' });
  });
});
