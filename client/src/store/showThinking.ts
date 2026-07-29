import { atomWithLocalStorage } from './utils';

const DEFAULT_SHOW_THINKING = false;

/**
 * This atom controls whether AI reasoning/thinking content is expanded by default.
 */
export const showThinkingAtom = atomWithLocalStorage<boolean>(
  'showThinking',
  DEFAULT_SHOW_THINKING,
);
