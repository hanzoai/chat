import { atom } from 'jotai';
import { SettingsViews, LocalStorageKeys } from '@hanzochat/data-provider';
import { atomWithLocalStorage } from '~/store/utils';
import type { TOptionSettings } from '~/common';

// Static atoms without localStorage
const staticAtoms = {
  abortScroll: atom<boolean>(false),
  optionSettings: atom<TOptionSettings>({}),
  currentSettingsView: atom<SettingsViews>(SettingsViews.default),
  showPopover: atom<boolean>(false),
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
  /**
   * The canvas's ambient backdrop. Scenery, so it is the visitor's call: it
   * costs a third-party embed and constant motion behind the text, and neither
   * is something to impose on someone who just wants to read their thread.
   * Default on — it is the product's first impression.
   */
  showBackdrop: atomWithLocalStorage('showBackdrop', true),
  /** Which footage the backdrop plays — a YouTube video id or URL. The
   *  aquarium by default; changeable from Settings or by asking the chat. */
  backdropVideo: atomWithLocalStorage('backdropVideo', '6lZ3CookYNg'),
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
