import { atomWithReset } from 'jotai/utils';

/**
 * The URL showing in the right-hand preview panel; '' when empty.
 *
 * The panel exists so what you are building is visible WITHOUT leaving chat —
 * you should not need a second tab to look at your own work.
 *
 * '' rather than null on purpose: this value is bound straight to a controlled
 * <input>, and null would make React switch the field to uncontrolled and warn.
 * `atomWithReset` because a new conversation must clear it — a preview still
 * pointing at the previous thread's output is worse than an empty panel, since
 * it reads as a current result.
 */
export const preview = atomWithReset<string>('');
