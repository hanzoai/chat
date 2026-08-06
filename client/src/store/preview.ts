import { atomFamily } from 'jotai/utils';
import { atomWithLocalStorage } from './utils';

/**
 * The URL showing in one bottom-bar tab's frame; '' when empty.
 *
 * The bar exists so what you are building is visible WITHOUT leaving chat —
 * you should not need a second tab to look at your own work. One atom per bar
 * tab, so two tabs are two pages rather than one page shown twice.
 *
 * '' rather than null on purpose: this value is bound straight to a controlled
 * <input>, and null would make React switch the field to uncontrolled and warn.
 * Persisted per tab, because the tab strip is persisted — a bar that reopens
 * with the right number of blank tabs would be worse than not reopening at all.
 */
export const preview = atomFamily((tabId: string) =>
  atomWithLocalStorage(`panel:bottom-url:${tabId}`, ''),
);
