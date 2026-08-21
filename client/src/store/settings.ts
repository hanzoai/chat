import { atom } from 'jotai';
import { SettingsViews, LocalStorageKeys } from '@hanzochat/data-provider';
import { atomWithLocalStorage, readStorage } from '~/store/utils';
import { merge } from '~/utils/backdrop';
import type { TOptionSettings } from '~/common';
import type { Backdrop } from '~/utils/backdrop';

/**
 * What the canvas paints when nobody has chosen anything: the reef, playing.
 * Every visitor, signed in or not, on the first paint of the first visit.
 *
 * The backdrop is what this product looks like — a stranger who has not signed
 * in is exactly the person who has to see it, and a scene nobody arrives at is
 * a scene nobody has. So it is on, for every brand, because brand has nothing
 * to do with it: putting brand inside a stored preference would answer a
 * question that was never about brand.
 *
 * State the cost rather than hide it. Playing on arrival tells YouTube the
 * visitor's address, user agent and that they opened this product, before they
 * have asked us for anything; and it decodes video behind someone's reading for
 * as long as the tab is open. Both are real, both are the price of the front
 * door looking like the product, and both are one click from off — the source
 * selector, or right-click on the canvas.
 *
 * Muted, and that is not negotiable here: `sound` below stays false, so the
 * scene arrives silent and makes noise only when somebody asks it to.
 *
 * Seeded from the two settings this one replaces, so an upgrade keeps what the
 * visitor already chose, in BOTH directions. `showBackdrop` was the old on/off
 * and defaulted on, so reading it with `true` reproduces it exactly: never
 * touched means play, explicitly turned off stays off. `backdropVideo` held
 * their footage, as a bare id or a URL, and `videoId` reads both.
 */
const DEFAULT_BACKDROP: Backdrop = {
  source: readStorage('showBackdrop', true) ? 'video' : 'off',
  photo: '',
  video: readStorage('backdropVideo', 'https://www.youtube.com/watch?v=6lZ3CookYNg'),
  playlist: [],
  loop: true,
  // Silent unless somebody asks. Nobody has ever wanted a browser tab to start
  // talking to them, and this one is wallpaper.
  sound: false,
};

/**
 * The canvas's ambient backdrop — what it shows, and whether it shows at all.
 * It starts playing (see DEFAULT above) and it is the visitor's to stop:
 * `source: 'off'` is the whole off switch, and there is no second flag beside
 * it. See utils/backdrop.
 *
 * `merge` guards the way OUT of storage as well as the way in, so the same one
 * rule decides what the canvas may paint whether the value was just typed or
 * was read back after a reload. Without it every promise `merge` makes — the
 * photo is an http(s) URL, the playlist is a list of links — would hold only
 * until the page refreshed, and a stored shape from an older release (or from
 * anything else that can write this origin's localStorage) would arrive
 * unexamined at an `<img src>` and at a `.filter` that would throw on it and
 * take the whole conversation down with it.
 */
const backdrop = atomWithLocalStorage<Backdrop>('backdrop', DEFAULT_BACKDROP, (stored) =>
  merge(DEFAULT_BACKDROP, stored),
);

// Static atoms without localStorage
const staticAtoms = {
  abortScroll: atom<boolean>(false),
  optionSettings: atom<TOptionSettings>({}),
  currentSettingsView: atom<SettingsViews>(SettingsViews.default),
  showPopover: atom<boolean>(false),
  /**
   * Whether the Settings dialog is on screen. Two controls open it — the account
   * menu and the ⌘K palette — and a boolean each would let both be true at once.
   * It lives here rather than in the account block because that block unmounts
   * with the collapsed rail, which would have made the palette's Settings row do
   * nothing at exactly the width where the menu holding it is also gone. Root
   * mounts the dialog; anyone may flip this.
   */
  showSettings: atom<boolean>(false),
};

const localStorageAtoms = {
  // General settings
  autoScroll: atomWithLocalStorage('autoScroll', false),
  // Whether a tool call opens showing its input and output, or collapsed to its
  // header. False keeps a run of completed calls out of the way; a reader opens
  // the one they care about.
  //
  // This atom was REFERENCED before it existed. ToolCallGroup and
  // useToolCallState both read store.autoExpandTools, which resolved to
  // undefined, and useAtomValue(undefined) throws "Atom is undefined or null" —
  // so every message carrying a tool call died on render. tsc had been saying so
  // in a pile of 814 errors nobody could act on.
  autoExpandTools: atomWithLocalStorage('autoExpandTools', false),
  // Smart routing user OVERRIDE. `null` (never touched) === follow the org's
  // server-driven default; `true`/`false` === an explicit user choice that wins.
  // When on, new conversations on the Hanzo endpoint default to model "auto" (the
  // gateway routes each prompt to the best/cheapest capable model; billed as
  // whatever served it). Resolved via resolveSmartRouting (utils/endpoints).
  smartRouting: atomWithLocalStorage<boolean | null>('smartRouting', null),
  hideSidePanel: atomWithLocalStorage('hideSidePanel', false),
  enableUserMsgMarkdown: atomWithLocalStorage<boolean>(
    LocalStorageKeys.ENABLE_USER_MSG_MARKDOWN,
    true,
  ),
  keepScreenAwake: atomWithLocalStorage('keepScreenAwake', true),

  // Chat settings
  enterToSend: atomWithLocalStorage('enterToSend', true),
  maximizeChatSpace: atomWithLocalStorage('maximizeChatSpace', false),
  chatDirection: atomWithLocalStorage('chatDirection', 'LTR'),
  showCode: atomWithLocalStorage(LocalStorageKeys.SHOW_ANALYSIS_CODE, true),
  saveDrafts: atomWithLocalStorage('saveDrafts', true),
  showScrollButton: atomWithLocalStorage('showScrollButton', true),
  forkSetting: atomWithLocalStorage('forkSetting', ''),
  splitAtTarget: atomWithLocalStorage('splitAtTarget', false),
  rememberDefaultFork: atomWithLocalStorage(LocalStorageKeys.REMEMBER_FORK_OPTION, false),
  showThinking: atomWithLocalStorage('showThinking', false),

  // Beta features settings
  modularChat: atomWithLocalStorage('modularChat', true),
  LaTeXParsing: atomWithLocalStorage('LaTeXParsing', true),
  showFooter: atomWithLocalStorage('showFooter', true),
  backdrop,
  /**
   * A lens onto `backdrop.loop`, not a second home for it: the toggle in
   * settings takes a boolean atom, and this gives it one that reads and writes
   * straight through to the single stored configuration.
   */
  backdropLoop: atom(
    (get) => get(backdrop).loop,
    (get, set, loop: boolean) => set(backdrop, { ...get(backdrop), loop }),
  ),
  /** The same lens onto `backdrop.sound`. */
  backdropSound: atom(
    (get) => get(backdrop).sound,
    (get, set, sound: boolean) => set(backdrop, { ...get(backdrop), sound }),
  ),
  /**
   * A personal sign-off under the account row in the sidebar foot — the
   * visitor's own line, not identity data, so it lives with the rest of the
   * nav's cosmetics in this browser. Empty means absent: the foot never
   * reserves space for silence.
   */
  signature: atomWithLocalStorage('signature', ''),
  /**
   * The dock: a column beside the conversation holding embedded surfaces
   * (a live feed, a world widget, an app preview). Default OFF — it is a
   * second thing competing for the width the messages need, so it is opt-in
   * rather than something a first-time visitor has to dismiss.
   */
  showDock: atomWithLocalStorage('showDock', false),

  // Commands settings
  atCommand: atomWithLocalStorage('atCommand', true),
  slashCommand: atomWithLocalStorage('slashCommand', true),

  // Speech settings
  conversationMode: atomWithLocalStorage('conversationMode', false),
  advancedMode: atomWithLocalStorage('advancedMode', false),

  engineSTT: atomWithLocalStorage('engineSTT', 'browser'),
  autoTranscribeAudio: atomWithLocalStorage('autoTranscribeAudio', false),
  decibelValue: atomWithLocalStorage('decibelValue', -45),
  autoSendText: atomWithLocalStorage('autoSendText', -1),

  textToSpeech: atomWithLocalStorage('textToSpeech', true),
  engineTTS: atomWithLocalStorage('engineTTS', 'browser'),
  voice: atomWithLocalStorage<string | undefined>('voice', undefined),
  cloudBrowserVoices: atomWithLocalStorage('cloudBrowserVoices', false),
  languageTTS: atomWithLocalStorage('languageTTS', ''),
  automaticPlayback: atomWithLocalStorage('automaticPlayback', false),
  playbackRate: atomWithLocalStorage<number | null>('playbackRate', null),
  cacheTTS: atomWithLocalStorage('cacheTTS', true),

  // Account settings
  UsernameDisplay: atomWithLocalStorage('UsernameDisplay', true),
};

export default { ...staticAtoms, ...localStorageAtoms };
