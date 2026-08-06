/**
 * The chat canvas's ambient video: one muted, looping YouTube embed painted
 * behind everything Presentation renders. The layer is `pointer-events-none`
 * and `aria-hidden`, so nothing about the chat's controls, focus order or
 * screen-reader surface changes — it is scenery, not UI.
 *
 * YouTube chrome (title, watermark, suggestions) is kept out of frame two
 * ways: the player is created with every control off, and the iframe is
 * center-cropped well past the viewport (16:9 cover, then overscan), so the
 * strips YouTube reserves at the top and bottom of the player land offscreen.
 * The scrim keeps text legible over bright footage.
 */
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import store from '~/store';

/** The 11-character video id, from a bare id or any YouTube URL shape
 *  (watch?v=, youtu.be/, embed/, shorts/, live/). Unparseable input falls
 *  back to the aquarium rather than to a broken player. */
export function video(chosen: string): string {
  const said = (chosen || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(said)) {
    return said;
  }
  const m =
    /(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([A-Za-z0-9_-]{11})/.exec(said);
  return m?.[1] ?? '6lZ3CookYNg';
}

const src = (id: string) =>
  // www.youtube.com, not youtube-nocookie: the nocookie host answers embeds
  // with "video player configuration error" (153) in current Chrome.
  `https://www.youtube.com/embed/${id}` +
  `?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}` +
  '&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&vq=hd1080' +
  `&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

/** Ask the player to start, through its API. Muted playback started by script
 *  is always allowed, and the API path sidesteps the viewability heuristic
 *  that can leave the autoplay param unhonored for a player sitting under the
 *  app's content layer. Repeated because the player ignores commands sent
 *  before its own scripts finish booting. */
function start(e: React.SyntheticEvent<HTMLIFrameElement>) {
  const frame = e.currentTarget;
  const post = (msg: object) =>
    frame.contentWindow?.postMessage(JSON.stringify(msg), 'https://www.youtube.com');
  const kick = () => {
    // The listening handshake makes the player report state back — the reveal
    // below waits for a real "playing" signal, so a refused or unavailable
    // video keeps the backdrop invisible instead of showing an error card.
    post({ event: 'listening', id: 'backdrop', channel: 'widget' });
    // The size-based auto-picker lands on hd1080 anyway (the box is far
    // larger than the viewport); the suggestion just skips the low first rung.
    post({ event: 'command', func: 'setPlaybackQuality', args: ['hd1080'] });
    post({ event: 'command', func: 'playVideo', args: [] });
  };
  kick();
  setTimeout(kick, 1500);
  setTimeout(kick, 4000);
}

export default function Backdrop() {
  const showBackdrop = useAtomValue(store.showBackdrop);
  const chosen = useAtomValue(store.backdropVideo);
  const id = video(chosen);
  // Revealed only once the player REPORTS footage rolling (playerState 1,
  // via the listening handshake in start). A video YouTube refuses — taken
  // down, region-blocked, embed throttled — never reports playing, so the
  // backdrop stays invisible instead of showing YouTube's error card
  // through the canvas.
  const [playing, setPlaying] = useState(false);
  // And never before the adaptive ramp has had its seconds: quality can't be
  // forced (embeds ignore every quality API since 2019), so the low-res
  // opening plays out hidden.
  const [ramped, setRamped] = useState(false);
  // A swapped video starts the ramp over.
  useEffect(() => {
    setPlaying(false);
    setRamped(false);
    const ramp = setTimeout(() => setRamped(true), 4000);
    return () => clearTimeout(ramp);
  }, [id]);
  useEffect(() => {
    const hear = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com') {
        return;
      }
      try {
        if (JSON.parse(e.data)?.info?.playerState === 1) {
          setPlaying(true);
        }
      } catch {
        /* not the player */
      }
    };
    window.addEventListener('message', hear);
    return () => window.removeEventListener('message', hear);
  }, []);
  // Off means ABSENT, not hidden: the embed is a third-party iframe that
  // autoplays video, so leaving it mounted at opacity 0 would keep streaming
  // behind a setting that says it is off.
  if (!showBackdrop) {
    return null;
  }
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <iframe
        key={id}
        src={src(id)}
        title=""
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        className="absolute left-1/2 top-1/2"
        onLoad={start}
        style={{
          opacity: playing && ramped ? 1 : 0,
          transition: 'opacity 1.2s ease',
          width: 'max(177.78vh, 100vw)',
          height: 'max(56.25vw, 100vh)',
          // The app styles iframes with max-width: 100%, which silently clamps
          // the cover formula to the container and letterboxes the video on
          // narrow screens. This box is deliberately larger than its container.
          maxWidth: 'none',
          maxHeight: 'none',
          transform: 'translate(-50%, -50%) scale(1.4)',
          border: 0,
        }}
      />
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}
