import { atom } from 'recoil';

/**
 * Inline "build an app" mode. When true, the chat surface renders a stripped-down
 * split shell: the chat thread on the left + a side preview pane on the right
 * (scaffold for the inline app builder — see components/BuildApp/BuildPreviewPane).
 *
 * A plain session flag (not persisted): entered from the composer "Build an app"
 * button or the `/build` route, exited from the preview pane's close button.
 */
export const buildMode = atom<boolean>({
  key: 'buildMode',
  default: false,
});
