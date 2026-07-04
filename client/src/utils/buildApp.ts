/**
 * The ONE definition of the "Build an app" handoff to the hanzo.app builder and
 * the `/build [prompt]` command grammar. Pure + unit-testable; shared by the
 * composer button, the `/build` slash interception in ChatForm, the assistant
 * message "Build this as an app" action, and the inline build preview pane.
 *
 * hanzo.app `/dev` reads `?prompt=` — that IS the real builder wire. Keeping the
 * URL construction in one place makes the chat -> app handoff uniform across
 * every surface (chat -> app -> console).
 */

/** The hanzo.app builder route. It reads the app spec from `?prompt=`. */
export const HANZO_APP_BUILDER_URL = 'https://hanzo.app/dev';

/** Build the hanzo.app builder deep-link for a prompt (omits an empty prompt). */
export function buildAppUrl(prompt?: string): string {
  const text = (prompt ?? '').trim();
  if (!text) {
    return HANZO_APP_BUILDER_URL;
  }
  return `${HANZO_APP_BUILDER_URL}?prompt=${encodeURIComponent(text)}`;
}

/** Open the hanzo.app builder for a prompt in a new tab (noopener). */
export function openAppBuilder(prompt?: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.open(buildAppUrl(prompt), '_blank', 'noopener,noreferrer');
}

const BUILD_COMMAND_RE = /^\/build(?:\s+([\s\S]*))?$/;

/**
 * Parse `/build [prompt]` into the prompt (possibly ''), or null if the text is
 * not a build command. Accepts `/build`, `/build make a todo app`. The prompt is
 * trimmed. `/buildx ...` is NOT a command (word-bounded, like `/agent`).
 */
export function parseBuildCommand(text: string): string | null {
  const m = BUILD_COMMAND_RE.exec((text ?? '').trim());
  if (!m) {
    return null;
  }
  return (m[1] ?? '').trim();
}

/** True once the input has begun a `/build` command (word-bounded). */
export function isBuildCommandPrefix(text: string): boolean {
  return /^\/build(\s|$)/.test((text ?? '').trimStart());
}
