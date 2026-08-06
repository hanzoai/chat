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
      const { container } = paint({ source: 'photo', photo: 'https://example.com/reef.jpg' });
      const image = container.querySelector('img');
      expect(image).toHaveAttribute('src', 'https://example.com/reef.jpg');
      expect(image).toHaveClass('object-cover');
    });

    it('stays invisible until the image has decoded', () => {
      const { container } = paint({ source: 'photo', photo: 'https://example.com/reef.jpg' });
      expect(container.querySelector('img')).toHaveStyle({ opacity: '0' });
    });

    it('renders no image when none is set', () => {
      const { container } = paint({ source: 'photo', photo: '' });
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

    it('embeds nothing for a link that is not a youtube video', () => {
      const { container } = paint({ source: 'video', video: 'https://www.netflix.com/watch/80100172' });
      expect(frames(container)).toEqual([]);
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
