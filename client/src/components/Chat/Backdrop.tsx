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
const VIDEO = '6lZ3CookYNg';

const SRC =
  // www.youtube.com, not youtube-nocookie: the nocookie host answers embeds
  // with "video player configuration error" (153) in current Chrome.
  `https://www.youtube.com/embed/${VIDEO}` +
  `?autoplay=1&mute=1&controls=0&loop=1&playlist=${VIDEO}` +
  '&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3' +
  `&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

/** Ask the player to start, through its API. Muted playback started by script
 *  is always allowed, and the API path sidesteps the viewability heuristic
 *  that can leave the autoplay param unhonored for a player sitting under the
 *  app's content layer. Repeated because the player ignores commands sent
 *  before its own scripts finish booting. */
function start(e: React.SyntheticEvent<HTMLIFrameElement>) {
  const frame = e.currentTarget;
  const kick = () =>
    frame.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      'https://www.youtube.com',
    );
  kick();
  setTimeout(kick, 1500);
  setTimeout(kick, 4000);
}

export default function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <iframe
        src={SRC}
        title=""
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        className="absolute left-1/2 top-1/2"
        onLoad={start}
        style={{
          width: 'max(177.78vh, 100vw)',
          height: 'max(56.25vw, 100vh)',
          transform: 'translate(-50%, -50%) scale(1.4)',
          border: 0,
        }}
      />
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}
