/**
 * Meet Hanzo — the cross-app "9-dot grid" launcher from the shared
 * @hanzogui/shell. Added ALONGSIDE LibreChat's conversation nav so Hanzo Chat
 * joins the unified Hanzo ecosystem nav.
 *
 * Click-only: the launcher's global ⌘/Ctrl-K quick-switch listener is disabled
 * (`quickSwitchKey={false}`) so adopting the shell never claims an app-wide
 * keyboard shortcut on the chat surface.
 */
import { HanzoAppLauncher } from '@hanzogui/shell';

export default function MeetHanzoLauncher() {
  return (
    <HanzoAppLauncher
      currentApp="chat"
      align="right"
      quickSwitchKey={false}
      label="Meet Hanzo"
    />
  );
}
