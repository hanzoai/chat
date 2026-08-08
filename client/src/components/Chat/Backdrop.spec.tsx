import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { Backdrop as Config } from '~/utils/backdrop';
import Backdrop from './Backdrop';
import store from '~/store';

const config = (over: Partial<Config> = {}): Config => ({
  source: 'off',
  photo: '',
  video: '',
  playlist: [],
  loop: true,
  ...over,
});

/** Render the backdrop with a given configuration, in its own jotai store so
 *  no case leaks into the next. */
function paint(over: Partial<Config> = {}) {
  const jotai = createStore();
  jotai.set(store.backdrop, config(over));
  const view = render(
    <Provider store={jotai}>
      <Backdrop />
    </Provider>,
  );
  return { ...view, jotai };
}

/** The backdrop is aria-hidden, so nothing in it is reachable by role or text;
 *  the frames are read straight out of the container instead. */
const frames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('iframe')).map((frame) => frame.getAttribute('src') ?? '');

const layer = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]');

/** The two origins `api/server/csp.js` names in `frame-src`, and the only two a
 *  player may ever be pointed at. */
const YOUTUBE = 'https://www.youtube.com/embed/';
const TWITCH = 'https://player.twitch.tv/';

describe('Backdrop', () => {
  describe('off', () => {
    it('renders nothing at all — not a hidden player', () => {
      const { container } = paint({ source: 'off', video: 'https://youtu.be/6lZ3CookYNg' });
      expect(container).toBeEmptyDOMElement();
      expect(frames(container)).toEqual([]);
    });
  });

  describe('photo', () => {
    it('covers the canvas with the image', () => {
      const { container } = paint({ source: 'photo', photo: '/images/reef.jpg' });
      const image = container.querySelector('img');
      expect(image).toHaveAttribute('src', '/images/reef.jpg');
      expect(image).toHaveClass('object-cover');
    });

    it('stays invisible until the image has decoded', () => {
      const { container } = paint({ source: 'photo', photo: '/images/reef.jpg' });
      expect(container.querySelector('img')).toHaveStyle({ opacity: '0' });
    });

    it('renders no image when none is set', () => {
      const { container } = paint({ source: 'photo', photo: '' });
      expect(container.querySelector('img')).toBeNull();
    });

    it('never points at a host the policy would refuse', () => {
      // Read back through `merge` on mount, so a stored beacon is dropped
      // before an <img> exists to fire it.
      const { container } = paint({ source: 'photo', photo: 'https://attacker.example/p?d=x' });
      expect(container.querySelector('img')).toBeNull();
    });
  });

  describe('video', () => {
    it('embeds the configured video, muted and looping', () => {
      const { container } = paint({
        source: 'video',
        video: 'https://www.youtube.com/watch?v=6lZ3CookYNg',
        loop: true,
      });
      const [src] = frames(container);
      expect(src).toContain('https://www.youtube.com/embed/6lZ3CookYNg?');
      expect(src).toContain('mute=1');
      expect(src).toContain('loop=1');
    });

    it('honours loop off', () => {
      const { container } = paint({ source: 'video', video: 'https://youtu.be/6lZ3CookYNg', loop: false });
      expect(frames(container)[0]).not.toContain('loop=1');
    });

    it('stays invisible until the player reports it is playing', () => {
      const { container } = paint({ source: 'video', video: 'https://youtu.be/6lZ3CookYNg' });
      expect(container.querySelector('iframe')).toHaveStyle({ opacity: '0' });
    });

    it('never frames a link that is not a youtube video', () => {
      // The configuration is read back through `merge` on every mount, so a
      // video slot holding something else does not reach the canvas at all: it
      // is refused and the known-good default plays instead. What must never
      // happen is the foreign origin appearing in a frame, at any opacity.
      const { container } = paint({
        source: 'video',
        video: 'https://www.netflix.com/watch/80100172',
      });
      expect(frames(container).join(' ')).not.toContain('netflix');
      frames(container).forEach((src) => expect(src.startsWith(YOUTUBE)).toBe(true));
    });
  });

  describe('playlist', () => {
    it('hands an all-youtube list to one player as a real playlist', () => {
      const { container } = paint({
        source: 'playlist',
        playlist: [
          { url: 'https://youtu.be/6lZ3CookYNg', provider: 'youtube' },
          { url: 'https://youtu.be/aaaaaaaaaaa', provider: 'youtube' },
        ],
      });
      const srcs = frames(container);
      expect(srcs).toHaveLength(1);
      expect(srcs[0]).toContain('/embed/6lZ3CookYNg?');
      expect(srcs[0]).toContain('playlist=aaaaaaaaaaa');
    });

    it('plays a mixed list one entry at a time, starting at the first', () => {
      const { container } = paint({
        source: 'playlist',
        playlist: [
          { url: 'https://twitch.tv/monstercat', provider: 'twitch' },
          { url: 'https://youtu.be/6lZ3CookYNg', provider: 'youtube' },
        ],
      });
      const srcs = frames(container);
      expect(srcs).toHaveLength(1);
      expect(srcs[0]).toContain('https://player.twitch.tv/?channel=monstercat');
    });

    it('tells twitch which host is framing it', () => {
      const { container } = paint({
        source: 'playlist',
        playlist: [
          { url: 'https://twitch.tv/monstercat', provider: 'twitch' },
          { url: 'https://youtu.be/6lZ3CookYNg', provider: 'youtube' },
        ],
      });
      expect(frames(container)[0]).toContain(`parent=${window.location.hostname}`);
    });

    it('never frames a netflix link — it skips it entirely', () => {
      const { container } = paint({
        source: 'playlist',
        playlist: [
          { url: 'https://www.netflix.com/watch/80100172', provider: 'other' },
          { url: 'https://youtu.be/6lZ3CookYNg', provider: 'youtube' },
        ],
      });
      const srcs = frames(container);
      expect(srcs.join(' ')).not.toContain('netflix');
      expect(srcs[0]).toContain('/embed/6lZ3CookYNg?');
    });

    it('paints nothing when every link is one nothing can play', () => {
      const { container } = paint({
        source: 'playlist',
        playlist: [
          { url: 'https://www.netflix.com/watch/80100172', provider: 'other' },
          { url: 'https://example.com/movie', provider: 'other' },
        ],
      });
      expect(frames(container)).toEqual([]);
    });

    it('gives an unplayable entry no player rather than the last one written', () => {
      // A provider with no player of its own must not fall through to whichever
      // branch happens to be last. Reached here by claiming a provider the entry
      // does not have, which is the shape a stale stored list would arrive in.
      const { container } = paint({
        source: 'playlist',
        playlist: [
          { url: 'https://www.netflix.com/watch/80100172', provider: 'other' },
          { url: 'https://twitch.tv/monstercat', provider: 'twitch' },
        ],
      });
      const srcs = frames(container);
      expect(srcs.join(' ')).not.toContain('netflix');
      expect(srcs[0]).toContain('https://player.twitch.tv/?channel=monstercat');
    });
  });

  describe('what it tells a third party', () => {
    it('sends a player the origin and never the conversation it sits behind', () => {
      const { container } = paint({ source: 'video', video: 'https://youtu.be/6lZ3CookYNg' });
      expect(container.querySelector('iframe')).toHaveAttribute(
        'referrerpolicy',
        'strict-origin-when-cross-origin',
      );
    });

    it('sends an image host the same, and no more', () => {
      const { container } = paint({ source: 'photo', photo: '/images/reef.jpg' });
      expect(container.querySelector('img')).toHaveAttribute(
        'referrerpolicy',
        'strict-origin-when-cross-origin',
      );
    });

    it('asks a player for autoplay and playback and for no capability beyond', () => {
      const { container } = paint({ source: 'video', video: 'https://youtu.be/6lZ3CookYNg' });
      const allow = container.querySelector('iframe')?.getAttribute('allow') ?? '';
      expect(allow).toBe('autoplay; encrypted-media');
      ['camera', 'microphone', 'geolocation', 'payment', 'display-capture'].forEach((power) =>
        expect(allow).not.toContain(power),
      );
    });
  });

  describe('what it will point a frame at', () => {
    /** Every configuration below is one nobody should be able to talk the canvas
     *  into framing. None of them is reachable through the UI; all of them are
     *  reachable by writing this origin's localStorage. */
    const hostile: Partial<Config>[] = [
      { source: 'video', video: 'https://evil.example/watch?v=6lZ3CookYNg' },
      { source: 'video', video: 'javascript:alert(1)' },
      { source: 'video', video: 'https://youtube.com.evil.example/watch?v=6lZ3CookYNg' },
      { source: 'playlist', playlist: [{ url: 'https://evil.example/x', provider: 'youtube' }] },
      {
        source: 'playlist',
        playlist: [{ url: 'https://www.netflix.com/watch/80100172', provider: 'twitch' }],
      },
      {
        source: 'playlist',
        playlist: [{ url: 'https://clips.twitch.tv/GloriousSlug', provider: 'twitch' }],
      },
    ];

    it.each(hostile.map((over, at) => [at, over]))(
      'frames only youtube or twitch, whatever configuration %i asks for',
      (_at, over) => {
        const { container } = paint(over as Partial<Config>);
        frames(container).forEach((src) =>
          expect(src.startsWith(YOUTUBE) || src.startsWith(TWITCH)).toBe(true),
        );
      },
    );

    it('names origins the served policy actually allows', () => {
      // A player pointed at an origin `frame-src` omits renders an EMPTY frame
      // and logs nothing useful, and a policy that allowed more than these two
      // would make the promise in the settings copy — that Netflix cannot play
      // here — false in the browser while still true in the UI. Read from the
      // real policy file so the two cannot drift apart. Same reasoning, and same
      // shape, as Chat/Dock/cards.spec.ts.
      const csp = readFileSync(join(__dirname, '../../../../api/server/csp.js'), 'utf8');
      const frameSrc = csp.split('\n').find((line) => line.includes('"frame-src')) ?? '';
      expect(frameSrc).toContain('frame-src');
      expect(frameSrc).toContain('https://www.youtube.com');
      expect(frameSrc).toContain('https://player.twitch.tv');
      // No wildcard may stand in for naming an origin.
      expect(frameSrc).not.toMatch(/frame-src[^;"]*\*/);
      expect(frameSrc).not.toContain('netflix');
    });
  });

  describe('as scenery', () => {
    it('takes no clicks and is hidden from assistive technology', () => {
      const { container } = paint({ source: 'video', video: 'https://youtu.be/6lZ3CookYNg' });
      expect(layer(container)).toHaveClass('pointer-events-none');
      expect(layer(container)).toHaveAttribute('aria-hidden', 'true');
    });

    it('keeps a player out of the focus order', () => {
      const { container } = paint({ source: 'video', video: 'https://youtu.be/6lZ3CookYNg' });
      expect(container.querySelector('iframe')).toHaveAttribute('tabindex', '-1');
    });

    it('lays a scrim over the footage so text stays legible', () => {
      const { container } = paint({ source: 'video', video: 'https://youtu.be/6lZ3CookYNg' });
      expect(container.querySelector('.bg-black\\/50')).toBeInTheDocument();
    });

    it('exposes no accessible content of its own', () => {
      paint({ source: 'video', video: 'https://youtu.be/6lZ3CookYNg' });
      expect(screen.queryAllByRole('img')).toEqual([]);
    });
  });
});
