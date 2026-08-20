/**
 * The curated backdrops, and the line that goes with each one.
 *
 * A backdrop is scenery, but the headline over it is COPY, so the two are one
 * value here rather than two lists someone has to keep in step. Pairing them in
 * a table is what makes "the reef says Explore new worlds" a fact of the data
 * instead of a coincidence of two files.
 *
 * EVERY ID WAS VERIFIED AGAINST YouTube's oembed ENDPOINT, not remembered. An
 * eleven-character id is unguessable by construction, so a curated list written
 * from memory shows a stranger's video — or nothing at all — and the failure is
 * invisible in review because one opaque id looks exactly like another. The
 * check that produced this list also found a dead one (401), which is the
 * argument for re-running it rather than trusting this comment: the videos are
 * somebody else's and can go away.
 *
 * WHAT MAKES A GOOD ONE: long (hours, so it does not restart under a reader),
 * quiet (we never unmute), and dim enough that white text survives the scrim.
 * "No music" in a title is a feature here, not a shrug — the sound is off, so a
 * soundtrack is only wasted bytes.
 */
export interface Scene {
  /** Stable key. Also what a `/bg <id>` command and the settings list name. */
  id: string;
  /** YouTube watch URL — the same shape a viewer pastes, so one parser reads both. */
  url: string;
  /** The line painted over it. Short: it is a headline, not a description. */
  headline: string;
  /** Shown in the picker so a viewer knows whose footage they are looking at. */
  credit: string;
}

const yt = (v: string) => `https://www.youtube.com/watch?v=${v}`;

export const SCENES: Scene[] = [
  { id: 'reef', url: yt('nMAzchVWTis'), headline: 'Explore new worlds.', credit: 'BBC Earth' },
  { id: 'space', url: yt('V8Wi2VF7juE'), headline: 'Reach escape velocity.', credit: '4KSpaceArtTV' },
  { id: 'earth', url: yt('YCXhoLwrc9s'), headline: 'Your users are down there.', credit: 'NASA footage' },
  { id: 'jellyfish', url: yt('nak03auK4I4'), headline: 'Find the flow.', credit: 'Balu' },
  { id: 'aurora', url: yt('T75IKSXVXlc'), headline: 'Rare things take patience.', credit: 'Nature Relaxation Films' },
  { id: 'clouds', url: yt('Y8ACyHYsb6Q'), headline: 'Well above the noise.', credit: 'Cloud 9' },
  { id: 'lava', url: yt('zbo6jUGrwdk'), headline: 'Good ideas take heat.', credit: 'Soothing Channel' },
  { id: 'fireplace', url: yt('cdKop6aixVE'), headline: 'The best builds happen after dark.', credit: 'Fireplace 10 Hours' },
  { id: 'rain', url: yt('SMAW3uW3VgU'), headline: 'Rain outside. Ship inside.', credit: 'Window Scenes' },
  { id: 'forest', url: yt('1t7g690boao'), headline: 'Touch grass. Then deploy.', credit: 'TheSilentWatcher' },
];

/**
 * The scene a URL belongs to, or undefined for footage somebody pasted.
 *
 * Matched on the ELEVEN-CHARACTER ID rather than the whole string, because the
 * same video is `watch?v=`, `youtu.be/`, `embed/` and a bare id depending on
 * where it was copied from, and a viewer who pastes the id of a curated scene
 * should get that scene's headline rather than fall through to the default.
 */
export function sceneOf(url: string | undefined | null): Scene | undefined {
  if (!url) {
    return undefined;
  }
  const id = (url.match(/[\w-]{11}/) ?? [])[0];
  return id ? SCENES.find((s) => s.url.includes(id)) : undefined;
}

/**
 * Weekday openers, for the people who actually use this: builders shipping on
 * their own clock. One per day so the room feels lived-in, and none of them
 * mention the weather.
 *
 * Sunday is index 0 because that is what `Date.getDay()` returns; reordering
 * for tidiness here would silently shift every day by one.
 */
export const DAYS: string[] = [
  'Slow Sunday',
  'Monday, from zero',
  'Tuesday, heads down',
  'Midweek momentum',
  'Turn up Thursday',
  'Ship-it Friday',
  'Saturday, no meetings',
];

/**
 * "Turn up Thursday, Zach" — or just "Turn up Thursday" when we have no name.
 *
 * The name is OPTIONAL and trimmed, because a signed-out visitor has none and
 * "Turn up Thursday, " with a trailing comma is worse than the line alone. Takes
 * the day as an argument rather than reading the clock, so the copy is decidable
 * in a test without freezing time.
 */
export function opener(day: number, name?: string | null): string {
  const line = DAYS[((day % 7) + 7) % 7];
  const who = (name ?? '').trim().split(/\s+/)[0];
  return who ? `${line}, ${who}` : line;
}
