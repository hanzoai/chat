/**
 * The chat canvas's backdrop: a still image, one muted video, or a list of
 * them, painted behind everything Presentation renders. The layer is
 * `pointer-events-none` and `aria-hidden`, so nothing about the chat's
 * controls, focus order or screen-reader surface changes — it is scenery, not
 * UI. That is also why nothing here is clickable: a backdrop that could take a
 * click would be a trap sitting under the conversation.
 *
 * NOTHING IS REVEALED UNTIL IT IS ACTUALLY THERE. A video is shown only once
 * the player reports footage rolling, an image only once it has decoded. A
 * video YouTube refuses — taken down, region-blocked, embed throttled — and an
 * image URL that 404s both simply stay invisible, instead of showing the
 * provider's error card through the canvas.
 *
 * Provider chrome (title, watermark, suggestions) is kept out of frame two
 * ways: players are built with every control off, and the frame is
 * center-cropped well past the viewport (16:9 cover, then overscan), so the
 * strips providers reserve at the top and bottom land offscreen. The scrim
 * keeps text legible over bright footage.
 *
 * Only YouTube and Twitch can be embedded. A Netflix link is scenery we cannot
 * paint — see utils/backdrop for why that is a fact about Netflix and not a
 * gap here — so it is skipped, and the settings panel is where it is labelled.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import type { Backdrop as Config, Link } from '~/utils/backdrop';
import { DWELL, playable, videoId, youtube, twitch } from '~/utils/backdrop';
import store from '~/store';

const ORIGIN = 'https://www.youtube.com';

/**
 * Send the origin, never the path.
 *
 * The address of a conversation is `/c/<id>`, and a `Referer` carrying it would
 * hand that id to YouTube, to Twitch, and to whatever host serves a photo
 * somebody pasted — on every load, to a party with no reason to know which
 * thread is open. Origin alone is all these embeds need: Twitch checks the
 * `parent` parameter and YouTube the `origin` one, both passed deliberately.
 * Chrome's default already stops at the origin; Safari and older engines do
 * not, which is why this is stated rather than assumed.
 */
const REFERRER = 'strict-origin-when-cross-origin';

/** How long the adaptive ramp is given before anything is revealed: quality
 *  cannot be forced (embeds have ignored every quality API since 2019), so the
 *  low-res opening plays out hidden. */
const RAMP = 4000;

/** The cover-crop: deliberately larger than the container, and told so twice
 *  because the app styles iframes with `max-width: 100%`, which would silently
 *  clamp the formula and letterbox the video on narrow screens. */
const COVER: React.CSSProperties = {
  width: 'max(177.78vh, 100vw)',
  height: 'max(56.25vw, 100vh)',
  maxWidth: 'none',
  maxHeight: 'none',
  transform: 'translate(-50%, -50%) scale(1.4)',
  border: 0,
};

const fade = (shown: boolean): React.CSSProperties => ({
  opacity: shown ? 1 : 0,
  transition: 'opacity 1.2s ease',
});

/**
 * Ask a YouTube player to start, through its API. Muted playback started by
 * script is always allowed, and the API path sidesteps the viewability
 * heuristic that can leave the autoplay param unhonored for a player sitting
 * under the app's content layer. Repeated because the player ignores commands
 * sent before its own scripts finish booting.
 */
function start(event: React.SyntheticEvent<HTMLIFrameElement>) {
  const frame = event.currentTarget;
  const post = (message: object) =>
    frame.contentWindow?.postMessage(JSON.stringify(message), ORIGIN);
  const kick = () => {
    // The listening handshake makes the player report state back — the reveal
    // below waits for a real "playing" signal.
    post({ event: 'listening', id: 'backdrop', channel: 'widget' });
    // The size-based auto-picker lands on hd1080 anyway (the box is far larger
    // than the viewport); the suggestion just skips the low first rung.
    post({ event: 'command', func: 'setPlaybackQuality', args: ['hd1080'] });
    post({ event: 'command', func: 'playVideo', args: [] });
  };
  kick();
  setTimeout(kick, 1500);
  setTimeout(kick, RAMP);
}

/** A YouTube player. Revealed on a real `playing` report; calls `onEnd` when
 *  the player says the video finished, which is how a mixed list advances. */
function Video({ src, onEnd }: { src: string; onEnd?: () => void }) {
  const sound = useAtomValue(store.backdrop).sound;
  const [playing, setPlaying] = useState(false);
  const [ramped, setRamped] = useState(false);
  const frame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const hear = (event: MessageEvent) => {
      if (event.origin !== ORIGIN) {
        return;
      }
      try {
        const state = JSON.parse(event.data)?.info?.playerState;
        if (state === 1) {
          setPlaying(true);
        } else if (state === 0) {
          onEnd?.();
        }
      } catch {
        /* not the player */
      }
    };
    window.addEventListener('message', hear);
    const ramp = setTimeout(() => setRamped(true), RAMP);
    return () => {
      window.removeEventListener('message', hear);
      clearTimeout(ramp);
    };
  }, [onEnd]);

  /**
   * Sound is turned on AFTER the player is playing, never in the URL.
   *
   * `mute=1` is what lets the embed start at all — autoplay with sound is
   * refused by every current browser — so unmuting is a command, and it is only
   * worth sending once the player has told us it is running: commands sent
   * before its scripts boot are dropped, which is the same reason `start` above
   * kicks three times. Gating on `playing` means this rides that report instead
   * of racing it.
   *
   * It also follows the toggle both ways while the video is on screen, so
   * turning the sound back off silences it now rather than at the next reload —
   * which is the one direction a person is likely to be in a hurry about.
   */
  useEffect(() => {
    if (!playing) {
      return;
    }
    const post = (message: object) =>
      frame.current?.contentWindow?.postMessage(JSON.stringify(message), ORIGIN);
    post({ event: 'command', func: sound ? 'unMute' : 'mute', args: [] });
    if (sound) {
      // Wallpaper, not a concert. Loud enough to hear under a conversation.
      post({ event: 'command', func: 'setVolume', args: [35] });
    }
  }, [playing, sound]);

  return (
    <iframe
      ref={frame}
      src={src}
      title=""
      tabIndex={-1}
      allow="autoplay; encrypted-media"
      referrerPolicy={REFERRER}
      className="absolute left-1/2 top-1/2"
      onLoad={start}
      style={{ ...COVER, ...fade(playing && ramped) }}
    />
  );
}

/**
 * A Twitch player.
 *
 * Twitch publishes no state channel for a bare iframe the way YouTube does —
 * reading playback state means loading their embed script, a third party we
 * would have to let run — so this reveals on load rather than on a playing
 * report. The honest consequence: an offline channel shows Twitch's own idle
 * screen rather than staying hidden. A live stream also never ends, so its
 * turn in a list is ended by the clock instead of by the player.
 */
function Stream({ src, onEnd }: { src: string; onEnd?: () => void }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!onEnd) {
      return;
    }
    const turn = setTimeout(onEnd, DWELL);
    return () => clearTimeout(turn);
  }, [onEnd]);

  return (
    <iframe
      src={src}
      title=""
      tabIndex={-1}
      allow="autoplay; encrypted-media"
      referrerPolicy={REFERRER}
      className="absolute left-1/2 top-1/2"
      onLoad={() => setLoaded(true)}
      style={{ ...COVER, ...fade(loaded) }}
    />
  );
}

/** A still image, revealed once it has decoded — a URL that 404s never fires
 *  `load`, so it stays invisible for the same reason a refused video does. */
function Photo({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={url}
      alt=""
      referrerPolicy={REFERRER}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ maxWidth: 'none', maxHeight: 'none', ...fade(loaded) }}
      onLoad={() => setLoaded(true)}
    />
  );
}

/**
 * One entry of a list, dispatched to the player its provider needs.
 *
 * Twitch is told the bare hostname it is being framed by — it refuses to load
 * for a `parent` it was not given — while YouTube's API handshake is keyed to
 * the full origin. Two different values, from the same page, for two different
 * reasons.
 */
function Entry({ entry, onEnd }: { entry: Link; onEnd: () => void }) {
  if (entry.provider === 'twitch') {
    return <Stream src={twitch(entry.url, window.location.hostname)} onEnd={onEnd} />;
  }
  if (entry.provider === 'youtube') {
    // No loop on a single entry: the list, not the video, decides what repeats.
    return (
      <Video src={youtube([videoId(entry.url)], false, window.location.origin)} onEnd={onEnd} />
    );
  }
  // Named, not defaulted. Callers filter by `playable` before they get here, so
  // this branch should be unreachable — but a dispatch whose LAST case is a
  // fall-through hands every future provider to whichever player happens to be
  // written last, and here that would ask YouTube to embed a netflix.com link.
  // A player has to be chosen on purpose; nothing else gets one.
  return null;
}

/** The list, one entry at a time: a video hands over when it ends, a stream
 *  when its dwell is up. Runs only when the list is NOT all YouTube — that
 *  case is handed to YouTube's own playlist player instead. */
function Rotation({ links, loop }: { links: Link[]; loop: boolean }) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  // A changed list is a new rotation, not a continuation of the old one.
  useEffect(() => {
    setIndex(0);
    setDone(false);
  }, [links]);

  const advance = useCallback(() => {
    setIndex((current) => {
      const next = current + 1;
      if (next < links.length) {
        return next;
      }
      if (loop) {
        return 0;
      }
      setDone(true);
      return current;
    });
  }, [links.length, loop]);

  const entry = links[index];
  if (done || !entry) {
    return null;
  }
  // Keyed by URL so a handover resets the next player's reveal state rather
  // than inheriting the last one's.
  return <Entry key={entry.url} entry={entry} onEnd={advance} />;
}

/** What the configuration asks to be painted, or null when that is nothing. */
function Scene({ config }: { config: Config }) {
  const links = useMemo(() => config.playlist.filter(playable), [config.playlist]);

  if (config.source === 'photo') {
    return config.photo ? <Photo url={config.photo} /> : null;
  }

  if (config.source === 'video') {
    const id = videoId(config.video);
    return id ? <Video src={youtube([id], config.loop, window.location.origin)} /> : null;
  }

  if (links.length === 0) {
    return null;
  }

  // An all-YouTube list is handed to YouTube's own playlist player: it holds
  // the queue in one frame, so there is no handover gap between videos and no
  // second player to reveal.
  if (links.every((entry) => entry.provider === 'youtube')) {
    return (
      <Video src={youtube(links.map((entry) => videoId(entry.url)), config.loop, window.location.origin)} />
    );
  }

  return <Rotation links={links} loop={config.loop} />;
}

export default function Backdrop() {
  const config = useAtomValue(store.backdrop);

  // Off means ABSENT, not hidden: these are third-party iframes that autoplay
  // video, so leaving one mounted at opacity 0 would keep streaming behind a
  // setting that says it is off.
  if (config.source === 'off') {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <Scene config={config} />
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}
