import { atom } from 'jotai';
import { SettingsViews, LocalStorageKeys } from '@hanzochat/data-provider';
import { atomWithLocalStorage, readStorage } from '~/store/utils';
import { merge } from '~/utils/backdrop';
import type { TOptionSettings } from '~/common';
import type { Backdrop } from '~/utils/backdrop';

/**
 * What the canvas paints when nobody has chosen anything: NOTHING. Black ground,
 * no third-party media, until someone asks for scenery.
 *
 * OFF FOR EVERY BRAND, not just Lux, because the reason is not taste. Playing
 * the backdrop hands a third party — YouTube — the visitor's address, user agent
 * and the fact that they opened this product, on first paint, before a stranger
 * has asked us for anything at all. That is a disclosure to make on request, and
 * a default is not a request. It also runs a video decode forever behind
 * somebody's reading, on an entry graph that was deliberately cut by a third to
 * put the composer on screen sooner. A per-brand default was the alternative and
 * is worse on its own terms: it would put brand inside a stored preference,
 * where nothing brand-shaped otherwise lives, to answer a question that was
 * never about brand.
 *
 * Nothing is removed — the source selector still offers video, playlist and
 * photo, and the reef stays as the video FIELD's default so choosing "Video"
 * has something to play. What changed is that nobody arrives there.
 *
 * Seeded from the two settings this one replaces, so an upgrade keeps what the
 * visitor already chose. `showBackdrop` was how someone said "yes, play it", so
 * anyone who had it on still starts at `video` — flipping the default must not
 * silently take the backdrop away from someone who went and asked for it;
 * `backdropVideo` held their footage, as a bare id or a URL, and `videoId`
 * reads both.
 */
const DEFAULT_BACKDROP: Backdrop = {
  source: readStorage('showBackdrop', false) ? 'video' : 'off',
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
 * Scenery, so it is the visitor's call: it costs a third-party embed and
 * constant motion behind the text, and neither is something to impose on
 * someone who just wants to read their thread. `source: 'off'` is the whole
 * off switch; there is no second flag beside it. See utils/backdrop.
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
  saveBadgesState: atomWithLocalStorage('saveBadgesState', false),

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
  plusCommand: atomWithLocalStorage('plusCommand', true),
  slashCommand: atomWithLocalStorage('slashCommand', true),

  // Speech settings
  conversationMode: atomWithLocalStorage('conversationMode', false),
  advancedMode: atomWithLocalStorage('advancedMode', false),

  speechToText: atomWithLocalStorage('speechToText', true),
  engineSTT: atomWithLocalStorage('engineSTT', 'browser'),
  languageSTT: atomWithLocalStorage('languageSTT', ''),
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
