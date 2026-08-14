import { LocalStorageKeys } from '@hanzochat/data-provider';

/**
 * What the browser tab says, composed in ONE place.
 *
 * Six call sites wrote `document.title` and they did not agree. Three set the
 * bare conversation title — so a tab read "Refactoring the auth module" and
 * named no app at all, which among a dozen open tabs is indistinguishable from
 * a note-taker, an issue tracker, or somebody else's chat. Two set the bare app
 * title. Only ShareView composed both, `"<convo> | <app>"`, and it is the one
 * surface a signed-in user never sees.
 *
 * Worse, `SearchButtons` assigned `cachedConvo?.title ?? ''` straight through:
 * an untitled conversation BLANKED the tab, and a browser handed an empty
 * `<title>` falls back to showing the raw URL. The tab most in need of a name
 * got the least readable one available.
 *
 * And `Startup.tsx` fell back to the literal `'Hanzo Chat'`. This app
 * white-labels — the app title belongs to the DEPLOYMENT — so that line printed
 * Hanzo's name on every other brand's login screen whenever config was slow.
 * There is no default here for the same reason: when nothing is known, leave
 * whatever `index.html` set, because that file is per-deployment and is already
 * the right answer.
 */

/** The deployment's own name, as last learned. `''` until config arrives. */
export function appName(): string {
  return localStorage.getItem(LocalStorageKeys.APP_TITLE) ?? '';
}

/**
 * Remember the deployment's name.
 *
 * Called where the startup config lands. It is separate from naming the tab
 * because learning the name and using it are different events — the config
 * arrives once, the tab is renamed on every conversation.
 */
export function learnAppName(name?: string | null): void {
  const clean = (name ?? '').trim();
  if (clean) {
    localStorage.setItem(LocalStorageKeys.APP_TITLE, clean);
  }
}

/**
 * The title for a conversation, or the app's own name when there is no
 * conversation. `app` defaults to what was learned; pass it when you hold the
 * config directly and the visitor may never have signed in (the share view).
 */
export function documentName(conversationTitle?: string | null, app = appName()): string {
  const convo = (conversationTitle ?? '').trim();
  const name = (app ?? '').trim();
  if (!convo) return name;
  // An em dash, which is how every Hanzo surface appends its name — the same
  // shape hanzo.app's title template writes. The pipe was a second spelling of
  // one convention, and a tab is where a person compares two of our tabs.
  return name ? `${convo} — ${name}` : convo;
}

/** Name the document — the one way to write `document.title`. */
export function nameDocument(conversationTitle?: string | null, app = appName()): void {
  const next = documentName(conversationTitle, app);
  // Nothing known yet: leave what index.html set rather than clearing the tab.
  if (next) {
    document.title = next;
  }
}
