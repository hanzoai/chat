import { applyFontSize } from '@hanzochat/client';
import { atomWithLocalStorageEffect, readStorage } from './utils';

const DEFAULT_FONT_SIZE = 'text-base';

/**
 * This atom stores the user's font size preference
 */
export const fontSizeAtom = atomWithLocalStorageEffect<string>(
  'fontSize',
  DEFAULT_FONT_SIZE,
  applyFontSize,
);

/**
 * Initialize font size on app load
 * This function applies the saved font size from localStorage to the DOM
 */
export const initializeFontSize = (): void => {
  readStorage('fontSize', DEFAULT_FONT_SIZE, applyFontSize);
};
