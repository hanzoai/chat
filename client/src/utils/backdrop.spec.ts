import { readFileSync } from 'fs';
import { join } from 'path';
import {
  web,
  picture,
  provider,
  videoId,
  channel,
  link,
  playable,
  youtube,
  twitch,
  merge,
  command,
} from './backdrop';
import type { Backdrop } from './backdrop';

const base: Backdrop = {
  source: 'video',
  photo: '',
  video: 'https://www.youtube.com/watch?v=6lZ3CookYNg',
  playlist: [],
  loop: true,
  sound: false,
};

describe('web', () => {
  it('keeps http and https', () => {
    expect(web('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(web('http://localhost:3080/a.png')).toBe('http://localhost:3080/a.png');
  });

  it('refuses schemes that are not the web', () => {
    expect(web('javascript:alert(1)')).toBe('');
    expect(web('data:image/png;base64,AAAA')).toBe('');
    expect(web('file:///etc/passwd')).toBe('');
  });

  it('refuses what is not a URL at all', () => {
    expect(web('')).toBe('');
    expect(web('   ')).toBe('');
    expect(web('not a url')).toBe('');
    expect(web(undefined)).toBe('');
    expect(web(42)).toBe('');
  });

  it('refuses a URL past any real length', () => {
    // localStorage is ONE quota shared with every other setting, so a pasted
    // megabyte is not this feature's problem alone — the next unrelated write
    // is the one that fails.
    expect(web(`https://example.com/${'a'.repeat(2100)}.png`)).toBe('');
    expect(web(`https://example.com/${'a'.repeat(2000)}.png`)).not.toBe('');
  });
});

describe('picture', () => {
  it('keeps a path on this origin, and keeps it relative', () => {
    // Relative because the app answers to several brands' domains: an absolute
    // origin stored today is the wrong origin on every other one.
    expect(picture('/images/reef.jpg')).toBe('/images/reef.jpg');
    expect(picture('/images/reef.jpg?v=2')).toBe('/images/reef.jpg?v=2');
    expect(picture('https://chat.hanzo.ai/images/reef.jpg')).toBe('');
  });

  it('keeps a file we serve from the store', () => {
    expect(picture('https://s3.hanzo.ai/a/reef.jpg')).toBe('https://s3.hanzo.ai/a/reef.jpg');
    expect(picture('https://s3-api.hanzo.ai/a/reef.jpg')).toBe('https://s3-api.hanzo.ai/a/reef.jpg');
  });

  it('refuses an image from anywhere else — a stored <img> is a beacon', () => {
    expect(picture('https://unsplash.example/reef.jpg')).toBe('');
    expect(picture('https://attacker.example/p?d=secret')).toBe('');
    expect(picture('http://localhost:9/x.png')).toBe('');
  });

  it('is not fooled by something that only looks like a path', () => {
    // `//host` and `/\host` both resolve to a DIFFERENT origin. This is why
    // the rule parses the value instead of matching a leading slash.
    expect(picture('//attacker.example/x.png')).toBe('');
    expect(picture('/\\attacker.example/x.png')).toBe('');
    expect(picture('/\\\\attacker.example/x.png')).toBe('');
  });

  it('refuses a scheme that is not the web, and nonsense', () => {
    expect(picture('javascript:alert(1)')).toBe('');
    expect(picture('data:image/png;base64,AAAA')).toBe('');
    expect(picture('blob:https://chat.hanzo.ai/abc')).toBe('');
    expect(picture('')).toBe('');
    expect(picture(undefined)).toBe('');
    expect(picture(42)).toBe('');
  });

  it('names only hosts the served policy allows', () => {
    // A photo `img-src` refuses does not fail loudly: the <img> never fires
    // `load`, so the canvas simply stays blank. Read the real policy so this
    // list and that one cannot drift apart.
    const csp = readFileSync(join(__dirname, '../../../api/server/csp.js'), 'utf8');
    // Matched on the directive, NOT on the quote that happened to precede it:
    // the policy became a template literal when it started interpolating the
    // issuer, and a needle of `"img-src` then found nothing. The assertions
    // below all passed against that empty string, so the one gate holding this
    // list and the served policy together had been quietly answering yes.
    const imgSrc = csp.split('\n').find((line) => line.includes('img-src')) ?? '';
    expect(imgSrc).toContain('img-src');
    ['https://s3.hanzo.ai', 'https://s3-api.hanzo.ai'].forEach((allowed) =>
      expect(imgSrc).toContain(allowed),
    );
    // The bare scheme is the beacon channel; it must stay closed.
    expect(imgSrc.split(' ')).not.toContain('https:');
  });
});

describe('provider', () => {
  it('recognises youtube in the forms people paste', () => {
    expect(provider('https://www.youtube.com/watch?v=6lZ3CookYNg')).toBe('youtube');
    expect(provider('https://youtube.com/watch?v=6lZ3CookYNg')).toBe('youtube');
    expect(provider('https://youtu.be/6lZ3CookYNg')).toBe('youtube');
    expect(provider('https://m.youtube.com/watch?v=6lZ3CookYNg')).toBe('youtube');
  });

  it('recognises twitch', () => {
    expect(provider('https://twitch.tv/monstercat')).toBe('twitch');
    expect(provider('https://www.twitch.tv/monstercat')).toBe('twitch');
  });

  it('classes netflix as other — it is not embeddable anywhere', () => {
    expect(provider('https://www.netflix.com/watch/80100172')).toBe('other');
  });

  it('does not fall for a lookalike host', () => {
    expect(provider('https://youtube.com.evil.example/watch?v=6lZ3CookYNg')).toBe('other');
    expect(provider('https://nottwitch.tv/x')).toBe('other');
  });
});

describe('videoId', () => {
  it('reads every YouTube link shape', () => {
    expect(videoId('https://www.youtube.com/watch?v=6lZ3CookYNg')).toBe('6lZ3CookYNg');
    expect(videoId('https://youtu.be/6lZ3CookYNg')).toBe('6lZ3CookYNg');
    expect(videoId('https://www.youtube.com/embed/6lZ3CookYNg')).toBe('6lZ3CookYNg');
    expect(videoId('https://www.youtube.com/shorts/6lZ3CookYNg')).toBe('6lZ3CookYNg');
    expect(videoId('https://www.youtube.com/watch?v=6lZ3CookYNg&t=42s')).toBe('6lZ3CookYNg');
  });

  it('accepts a bare id', () => {
    expect(videoId('6lZ3CookYNg')).toBe('6lZ3CookYNg');
  });

  it('is empty for anything that is not a youtube video', () => {
    expect(videoId('https://www.netflix.com/watch/80100172')).toBe('');
    expect(videoId('https://twitch.tv/monstercat')).toBe('');
    expect(videoId('https://www.youtube.com/')).toBe('');
    expect(videoId('nonsense')).toBe('');
  });
});

describe('channel', () => {
  it('reads a live channel', () => {
    expect(channel('https://www.twitch.tv/monstercat')).toEqual({
      key: 'channel',
      name: 'monstercat',
    });
  });

  it('reads a recorded video', () => {
    expect(channel('https://www.twitch.tv/videos/123456789')).toEqual({
      key: 'video',
      name: '123456789',
    });
  });

  it('is empty for a non-twitch link', () => {
    expect(channel('https://www.netflix.com/watch/1').name).toBe('');
  });

  it('refuses a clip rather than quietly playing the channel instead', () => {
    // The clip embed is a different host with a different parameter. Falling
    // back to the channel would put a live stream on the canvas in place of the
    // few seconds that were asked for — the wrong thing, and not obviously so.
    expect(channel('https://www.twitch.tv/monstercat/clip/GloriousSlug').name).toBe('');
    expect(playable({ url: 'https://www.twitch.tv/x/clip/GloriousSlug', provider: 'twitch' })).toBe(
      false,
    );
  });
});

describe('playable', () => {
  it('plays youtube and twitch', () => {
    expect(playable({ url: 'https://youtu.be/6lZ3CookYNg', provider: 'youtube' })).toBe(true);
    expect(playable({ url: 'https://twitch.tv/monstercat', provider: 'twitch' })).toBe(true);
  });

  it('never plays netflix or anything else classed other', () => {
    expect(playable({ url: 'https://www.netflix.com/watch/80100172', provider: 'other' })).toBe(
      false,
    );
    expect(playable({ url: 'https://example.com/movie', provider: 'other' })).toBe(false);
  });

  it('does not play a youtube host with no video in it', () => {
    expect(playable({ url: 'https://www.youtube.com/feed/you', provider: 'youtube' })).toBe(false);
  });
});

describe('youtube embed', () => {
  it('loops a single video by repeating it as its own list', () => {
    const src = youtube(['6lZ3CookYNg'], true, 'https://chat.hanzo.ai');
    expect(src).toContain('https://www.youtube.com/embed/6lZ3CookYNg?');
    expect(src).toContain('loop=1');
    expect(src).toContain('playlist=6lZ3CookYNg');
    expect(src).toContain('mute=1');
    expect(src).toContain('enablejsapi=1');
    expect(src).toContain('origin=https%3A%2F%2Fchat.hanzo.ai');
  });

  it('does not loop when loop is off', () => {
    expect(youtube(['6lZ3CookYNg'], false, 'https://chat.hanzo.ai')).not.toContain('loop=1');
  });

  it('plays the rest of the list after the first video', () => {
    const src = youtube(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'], false, 'https://x.test');
    expect(src).toContain('/embed/aaaaaaaaaaa?');
    expect(src).toContain('playlist=bbbbbbbbbbb,ccccccccccc');
  });
});

describe('twitch embed', () => {
  it('always carries the parent host it is framed by', () => {
    const src = twitch('https://twitch.tv/monstercat', 'chat.hanzo.ai');
    expect(src).toContain('https://player.twitch.tv/?channel=monstercat');
    expect(src).toContain('parent=chat.hanzo.ai');
    expect(src).toContain('muted=true');
  });

  it('asks for a VOD by video id', () => {
    expect(twitch('https://twitch.tv/videos/123456789', 'chat.hanzo.ai')).toContain(
      'video=123456789',
    );
  });
});

describe('merge', () => {
  it('takes a valid source', () => {
    expect(merge(base, { source: 'photo' }).source).toBe('photo');
  });

  it('ignores a source that is not one of ours', () => {
    expect(merge(base, { source: 'hologram' }).source).toBe('video');
  });

  it('refuses a photo URL that is not http(s)', () => {
    expect(merge(base, { photo: 'javascript:alert(1)' }).photo).toBe('');
  });

  it('refuses a photo from a host the policy will not load', () => {
    expect(merge(base, { photo: 'https://attacker.example/p?d=secret' }).photo).toBe('');
    expect(merge(base, { photo: '/images/reef.jpg' }).photo).toBe('/images/reef.jpg');
  });

  it('refuses a video that is not a youtube video', () => {
    expect(merge(base, { video: 'https://www.netflix.com/watch/80100172' }).video).toBe(base.video);
  });

  it('recomputes the provider instead of believing the caller', () => {
    const next = merge(base, {
      playlist: [{ url: 'https://www.netflix.com/watch/80100172', provider: 'youtube' }],
    });
    expect(next.playlist).toEqual([
      { url: 'https://www.netflix.com/watch/80100172', provider: 'other' },
    ]);
    expect(next.playlist.every(playable)).toBe(false);
  });

  it('drops playlist entries that are not URLs', () => {
    expect(merge(base, { playlist: ['nope', 'https://twitch.tv/monstercat'] }).playlist).toEqual([
      { url: 'https://twitch.tv/monstercat', provider: 'twitch' },
    ]);
  });

  it('leaves the current value alone when handed nonsense', () => {
    expect(merge(base, null)).toEqual(base);
    expect(merge(base, 'off')).toEqual(base);
    expect(merge(base, {})).toEqual(base);
  });

  it('survives a stored shape nothing in this release ever wrote', () => {
    // What comes back out of localStorage is not what we put in: an older
    // release wrote a different shape, and anything with access to this origin
    // can write any shape at all. `Scene` calls .filter on the playlist, so a
    // playlist that is not a list is a blank page, not a missing backdrop.
    expect(merge(base, { playlist: 'https://youtu.be/6lZ3CookYNg' }).playlist).toEqual([]);
    expect(merge(base, { playlist: [null, 7, {}, []] }).playlist).toEqual([]);
    expect(merge(base, { source: null, loop: 'yes', photo: 42 })).toEqual(base);
    expect(merge(base, [])).toEqual(base);
  });

  it('keeps the playlist to a length that fits beside every other setting', () => {
    const many = Array.from({ length: 500 }, (_, at) => `https://youtu.be/${'a'.repeat(10)}${at % 10}`);
    expect(merge(base, { playlist: many }).playlist.length).toBeLessThanOrEqual(64);
  });
});

describe('command', () => {
  it('is not interested in ordinary messages', () => {
    expect(command('what is the weather', base)).toBeNull();
    expect(command('/background', base)).toBeNull();
    expect(command('/backgrounder off', base)).toBeNull();
  });

  it('is two words exactly, not any word that starts with them', () => {
    // A word boundary is not enough: `/background-image` clears one, and a
    // question about CSS would have quietly become a command.
    expect(command('/background-image photo https://example.com/a.png', base)).toBeNull();
    expect(command('/bg-off off', base)).toBeNull();
    expect(command('/background: photo https://example.com/a.png', base)).toBeNull();
  });

  it('degrades a malformed line to a message rather than to a crash', () => {
    ['/bg', '/bg ', '/bg photo', '/bg add', '/bg video', '/bg loop', '/bg wat x'].forEach((line) =>
      expect(command(line, base)).toBeNull(),
    );
  });

  it('turns the backdrop off', () => {
    expect(command('/bg off', base)?.source).toBe('off');
    expect(command('/background off', base)?.source).toBe('off');
    expect(command('  /BG   off  ', base)?.source).toBe('off');
  });

  it('sets a photo', () => {
    const next = command('/bg photo /images/reef.jpg', base);
    expect(next).toMatchObject({ source: 'photo', photo: '/images/reef.jpg' });
  });

  it('sets a video', () => {
    const next = command('/bg video https://youtu.be/6lZ3CookYNg', base);
    expect(next).toMatchObject({ source: 'video', video: 'https://youtu.be/6lZ3CookYNg' });
  });

  it('adds to the playlist and switches to it', () => {
    const next = command('/bg add https://twitch.tv/monstercat', base);
    expect(next).toMatchObject({
      source: 'playlist',
      playlist: [{ url: 'https://twitch.tv/monstercat', provider: 'twitch' }],
    });
  });

  it('appends rather than replacing', () => {
    const once = command('/bg add https://youtu.be/6lZ3CookYNg', base);
    const twice = command('/bg add https://twitch.tv/monstercat', once as Backdrop);
    expect(twice?.playlist).toHaveLength(2);
  });

  it('toggles loop', () => {
    expect(command('/bg loop off', base)?.loop).toBe(false);
    expect(command('/bg loop on', { ...base, loop: false })?.loop).toBe(true);
    expect(command('/bg loop maybe', base)).toBeNull();
  });

  it('refuses to add a link nothing can play', () => {
    expect(command('/bg add https://www.netflix.com/watch/80100172', base)).toBeNull();
  });

  it('refuses a photo that is not a web URL', () => {
    expect(command('/bg photo javascript:alert(1)', base)).toBeNull();
  });

  it('refuses a photo from a host the policy will not load', () => {
    expect(command('/bg photo https://attacker.example/p?d=secret', base)).toBeNull();
  });

  it('refuses a video that is not a youtube video', () => {
    expect(command('/bg video https://www.netflix.com/watch/80100172', base)).toBeNull();
  });
});
