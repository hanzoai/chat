/**
 * What the chat canvas paints behind the conversation, and the pure functions
 * that read it. No React here on purpose: every rule about what can play, what
 * a link means and what a typed command does is decidable from data alone, so
 * it is decidable in a test without rendering anything.
 *
 * ONE switch, not two. `source: 'off'` is the only way to say "no backdrop" —
 * there is deliberately no separate enable flag beside it, because a pair of
 * them makes two different states (off + video, on + off) that render the same
 * nothing, and that ambiguity is the kind of thing that later grows a bug.
 * The retired `showBackdrop` boolean is folded in: see DEFAULT in store/settings.
 *
 * WHAT CANNOT PLAY, AND WHY: only YouTube and Twitch are embeddable here.
 * Netflix — and every other DRM service — has no public embed, wraps playback
 * in Widevine, and forbids framing in its terms. There is no key, no partner
 * tier and no clever iframe that changes that, so a Netflix link is classed
 * `other` and NEVER becomes an iframe; the settings list shows it as a link
 * that opens in a tab and says it cannot play here. Anything else would be
 * pretending.
 *
 * We never ask for a provider password. A members-only or age-gated stream
 * plays if — and only if — the viewer is already signed in to that provider in
 * this browser, because the embed rides their own cookies. Collecting those
 * credentials ourselves is not a feature we are missing; it is one we refuse.
 *
 * A PHOTO IS OURS, and that rule is `picture` rather than `web` — an image is
 * fetched with no click and no script, and a stored one is fetched again on
 * every visit. See the note there.
 */

/** Who serves a link. `other` means "we cannot play this", not "unknown". */
export type Provider = 'youtube' | 'twitch' | 'other';

/** What the backdrop is showing. `off` is the master switch. */
export type Source = 'off' | 'photo' | 'video' | 'playlist';

/** One entry of the playlist: what the viewer pasted, and who serves it. */
export interface Link {
  url: string;
  provider: Provider;
}

export interface Backdrop {
  source: Source;
  /** Image URL. Empty means the viewer has not chosen one. */
  photo: string;
  /** YouTube URL (or bare id). Empty means unset. */
  video: string;
  playlist: Link[];
  /** Repeat when the end is reached — the single video, or the whole list. */
  loop: boolean;
  /**
   * Play the backdrop's audio. OFF by default, and that default is the point: a
   * page that starts making noise on its own is a page people close, and this
   * one is scenery behind someone's reading.
   *
   * It is not a URL parameter. The embed must start MUTED or it does not start
   * at all — every current browser refuses autoplay with sound — so `mute=1`
   * stays in the player params and the sound is turned on afterwards, through
   * the API, once the player reports it is actually playing. Turning this on IS
   * the gesture that permits it: a setting a person just toggled is a user
   * activation, which is the thing the autoplay policy asks for.
   */
  sound: boolean;
}

/** How long a live stream holds the canvas before the list moves on. A Twitch
 *  channel never ends, so unlike a video it cannot announce its own turn is up. */
export const DWELL = 5 * 60 * 1000;

/**
 * The longest URL we will keep. Browsers stopped being the limit long ago; the
 * limit that matters is localStorage, one quota shared by every preference this
 * app stores. A URL is a string a visitor can paste, so without a ceiling one
 * pasted megabyte can fill that quota and the NEXT write of any unrelated
 * setting is the one that throws. 2048 is the length every server and proxy has
 * accepted since forever, and far past any real link.
 */
const LONGEST = 2048;

/** The longest playlist. Same quota, same reasoning: `add` is a loop a visitor
 *  can run, so it needs an end. Well past any list anyone watches. */
const MOST = 64;

/**
 * The URL if it is one we are willing to load, else ''. Anything that is not
 * http(s) — `javascript:`, `data:`, `blob:` — is refused here, at the boundary,
 * so no caller downstream has to remember to check.
 */
export function web(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > LONGEST) {
    return '';
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

const host = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

/**
 * The image hosts `img-src` in api/server/csp.js names besides this page's own
 * origin. Kept in step by backdrop.spec, which reads the real policy file.
 */
const PICTURES = ['s3.hanzo.ai', 's3-api.hanzo.ai'];

/** Any absolute URL resolves against this, so a relative path can be told from
 *  one that only looks relative. Never fetched; it is a ruler, not a place. */
const HERE = 'https://backdrop.invalid';

/**
 * The image the backdrop may paint, else ''.
 *
 * Narrower than `web` on purpose, and this is the one rule in the file that is
 * not about what plays. An `<img>` fires a GET the moment it renders, with no
 * click and no script, and this one is stored — so it refires on every load
 * afterwards, reporting the viewer's address to whoever owns the host, forever.
 * That is the same beacon the markdown renderer refuses (MarkdownComponents
 * `autoLoadable`) and the same one `img-src` stopped allowing when it dropped
 * the bare `https:` scheme. A background is not the hole left in that door.
 *
 * So a photo is ours: a path on this origin — kept RELATIVE, because the app is
 * served under several brands' domains and a stored absolute origin would be
 * wrong on all but one — or a file we serve from the store. A URL the policy
 * would refuse is dropped here instead, where it can be answered honestly: a
 * blocked image never fires `load`, so allowing it would mean a blank canvas
 * and nothing anywhere saying why.
 *
 * Backslashes are why this parses rather than matches: `/\evil.example/x.png`
 * looks like a path and resolves to a different host.
 */
export function picture(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > LONGEST) {
    return '';
  }
  try {
    const url = new URL(value.trim(), HERE);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    if (url.origin === HERE) {
      return url.pathname + url.search;
    }
    return PICTURES.includes(host(url.href)) ? url.href : '';
  } catch {
    return '';
  }
}

/** Who serves this link, decided by host alone. */
export function provider(url: string): Provider {
  const name = host(url);
  if (name === 'youtube.com' || name === 'm.youtube.com' || name === 'music.youtube.com') {
    return 'youtube';
  }
  if (name === 'youtu.be') {
    return 'youtube';
  }
  if (name === 'twitch.tv' || name === 'm.twitch.tv' || name === 'player.twitch.tv') {
    return 'twitch';
  }
  return 'other';
}

/** A YouTube video id is exactly 11 of these. */
const ID = /^[\w-]{11}$/;

/**
 * The video id inside a YouTube URL, or '' if there is not one. Accepts the
 * forms people actually paste — watch links, share links, shorts, embeds — and
 * a bare id, which is what the address bar leaves you with often enough.
 */
export function videoId(value: string): string {
  const raw = value.trim();
  if (ID.test(raw)) {
    return raw;
  }
  const url = web(raw);
  if (!url || provider(url) !== 'youtube') {
    return '';
  }
  const { pathname, searchParams } = new URL(url);
  const query = searchParams.get('v') ?? '';
  if (ID.test(query)) {
    return query;
  }
  // youtu.be/ID, /embed/ID, /shorts/ID, /live/ID — the id is the last segment.
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return ID.test(last) ? last : '';
}

/**
 * What to ask the Twitch player for: a live `channel`, or a recorded `video`.
 * Empty `name` means the URL names neither.
 *
 * A CLIP names neither. `twitch.tv/<channel>/clip/<slug>` is a few seconds
 * somebody cut out, and the player this builds cannot ask for one — the clip
 * embed is a different host with a different parameter. Falling back to the
 * channel would put a LIVE STREAM on the canvas in place of the clip that was
 * asked for: not the thing, and not obviously not the thing. So a clip is
 * unplayable, and the settings list says so with a link out, exactly as it does
 * for Netflix. Refusing what we cannot serve beats serving something else.
 */
export function channel(value: string): { key: 'channel' | 'video'; name: string } {
  const none = { key: 'channel', name: '' } as const;
  const url = web(value);
  if (!url || provider(url) !== 'twitch') {
    return none;
  }
  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean);
  const direct = parsed.searchParams.get('channel') ?? parsed.searchParams.get('video') ?? '';
  if (direct) {
    return { key: parsed.searchParams.get('video') ? 'video' : 'channel', name: direct };
  }
  if (parts[0] === 'videos' && parts[1]) {
    return { key: 'video', name: parts[1] };
  }
  if (parts.includes('clip')) {
    return none;
  }
  return { key: 'channel', name: parts[0] ?? '' };
}

/** A playlist entry from a pasted URL, or null if it is not a URL at all. */
export function link(value: string): Link | null {
  const url = web(value);
  return url ? { url, provider: provider(url) } : null;
}

/** Whether we can actually put this on the canvas. `other` never can. */
export function playable(entry: Link): boolean {
  if (entry.provider === 'youtube') {
    return videoId(entry.url) !== '';
  }
  if (entry.provider === 'twitch') {
    return channel(entry.url).name !== '';
  }
  return false;
}

/** Every YouTube player param that keeps the chrome out of frame. */
const PLAYER = [
  'autoplay=1',
  'mute=1',
  'controls=0',
  'rel=0',
  'playsinline=1',
  'disablekb=1',
  'fs=0',
  'iv_load_policy=3',
  'vq=hd1080',
  // The listening handshake this enables is what lets the canvas wait for a
  // real "playing" report before revealing anything.
  'enablejsapi=1',
].join('&');

/**
 * The embed URL for one or more YouTube videos.
 *
 * www.youtube.com, not youtube-nocookie: the nocookie host answers embeds with
 * "video player configuration error" (153) in current Chrome.
 *
 * `loop` needs `playlist` even for a single video — that is YouTube's rule, not
 * ours: a lone video with `loop=1` and no list plays once and stops.
 */
export function youtube(ids: string[], loop: boolean, origin: string): string {
  const [first, ...rest] = ids;
  const params = [PLAYER, `origin=${encodeURIComponent(origin)}`];
  if (loop) {
    params.push('loop=1', `playlist=${(rest.length ? rest : [first]).join(',')}`);
  } else if (rest.length) {
    params.push(`playlist=${rest.join(',')}`);
  }
  return `https://www.youtube.com/embed/${first}?${params.join('&')}`;
}

/**
 * The embed URL for a Twitch channel or VOD. `parent` is mandatory — Twitch
 * refuses to frame for a host it was not told about — and must be the bare
 * hostname, no scheme, no port.
 */
export function twitch(value: string, parent: string): string {
  const { key, name } = channel(value);
  return (
    `https://player.twitch.tv/?${key}=${encodeURIComponent(name)}` +
    `&parent=${encodeURIComponent(parent)}&muted=true&autoplay=true&controls=false`
  );
}

const SOURCES: Source[] = ['off', 'photo', 'video', 'playlist'];

/**
 * Fold an untrusted description of a backdrop onto the current one.
 *
 * This is the ONE gate, and it is deliberately total: anything it cannot make
 * sense of is dropped and the current value kept, so no caller can push the atom
 * into a shape the canvas has to defend against later. Everything that reaches
 * the atom comes through here — the settings panel, the `hanzo-setting` card a
 * model can propose (Chat/Messages/Content/Adjust), and the read back out of
 * localStorage on the next load (store/settings), which matters because the
 * bytes in storage are not ours and a rule enforced only on the way in lasts
 * exactly until the page is refreshed.
 */
export function merge(current: Backdrop, change: unknown): Backdrop {
  if (typeof change !== 'object' || change === null) {
    return current;
  }
  const next = { ...current };
  const given = change as Record<string, unknown>;

  if (SOURCES.includes(given.source as Source)) {
    next.source = given.source as Source;
  }
  if (typeof given.loop === 'boolean') {
    next.loop = given.loop;
  }
  if (typeof given.sound === 'boolean') {
    next.sound = given.sound;
  }
  const photo = picture(given.photo);
  if (photo) {
    next.photo = photo;
  }
  if (given.video !== undefined && videoId(String(given.video))) {
    next.video = String(given.video).trim();
  }
  if (Array.isArray(given.playlist)) {
    // The provider is recomputed from the URL every time rather than believed:
    // a caller claiming `provider: 'youtube'` for a netflix.com link must not
    // be able to talk the canvas into framing it.
    next.playlist = given.playlist
      .map((entry) =>
        link(typeof entry === 'string' ? entry : String((entry as Link | null)?.url ?? '')),
      )
      .filter((entry): entry is Link => entry !== null)
      .slice(0, MOST);
  }
  return next;
}

/**
 * `/background` or `/bg`, and then a space or the end of the line — not merely
 * a word boundary, which `/background-image …` also satisfies. A command is one
 * of exactly two words; anything else is a message and is sent as one.
 */
const VERB = /^\/(?:background|bg)(?:\s|$)/i;

/**
 * Read a `/background` (or `/bg`) line typed into the composer.
 *
 * Returns the backdrop it asks for, or null when the line is not one of these
 * commands or names something unusable — null meaning "not handled", so the
 * caller sends it on as an ordinary message and the viewer can see for
 * themselves that nothing was applied.
 *
 *   /bg off              stop painting anything
 *   /bg photo <url>      a still image
 *   /bg video <url>      one YouTube video
 *   /bg add <url>        append to the playlist and switch to it
 *   /bg loop on|off      repeat at the end
 *
 * There is no `/bg <url>` that guesses: guessing is a second way to say what
 * `photo` and `video` already say exactly, and the guess is wrong precisely
 * when the URL is unusual — which is when being wrong costs the most.
 */
export function command(input: string, current: Backdrop): Backdrop | null {
  const line = input.trim();
  if (!VERB.test(line)) {
    return null;
  }
  const [, verb = '', ...rest] = line.split(/\s+/);
  const argument = rest.join(' ').trim();

  switch (verb.toLowerCase()) {
    case 'off':
      return { ...current, source: 'off' };
    case 'photo': {
      const url = picture(argument);
      return url ? { ...current, source: 'photo', photo: url } : null;
    }
    case 'video':
      return videoId(argument) ? { ...current, source: 'video', video: argument.trim() } : null;
    case 'add': {
      // Through `merge` so the list has ONE keeper of its length, rather than a
      // second append here that forgets what the first one enforces.
      const entry = link(argument);
      return entry && playable(entry)
        ? merge(current, { source: 'playlist', playlist: [...current.playlist, entry] })
        : null;
    }
    case 'loop': {
      const on = argument.toLowerCase();
      return on === 'on' || on === 'off' ? { ...current, loop: on === 'on' } : null;
    }
    default:
      return null;
  }
}
