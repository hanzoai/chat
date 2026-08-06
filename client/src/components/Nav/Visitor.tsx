import { useState } from 'react';
import { CreditCard, CircleHelp } from 'lucide-react';
import { GearIcon, Button } from '@hanzochat/client';
import { useGetStartupConfig } from '~/data-provider';
import { startHanzoLogin } from '~/utils/login';
import { useLocalize } from '~/hooks';
import Settings from './Settings';

/**
 * The foot of the sidebar for a visitor who is not signed in.
 *
 * It is the counterpart of `AccountSettings`, and the two are mutually exclusive:
 * the corner belongs to whichever one the session calls for, so there is never an
 * account menu with no account behind it. Signed out, that menu had exactly one
 * usable row — "Log in" — and everything a visitor might actually want first
 * (what it costs, how to change the theme, where the docs are) was inside a
 * dropdown that only opened for people who no longer needed it.
 *
 * `Settings` is the SAME modal the account menu opens, not a signed-out copy of
 * it: theme, language and the chat display preferences are all local state and
 * work perfectly well without a session. One settings surface, one way in.
 *
 * Sign-up is a genuinely different destination from log-in — hanzo.id serves the
 * app-scoped `/signup/hanzo-chat` form — so the secondary is a real second path
 * and not the primary wearing another label. Both are hanzo.id; chat implements
 * no account creation of its own.
 */

const ROW =
  'flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-sm text-text-primary transition-colors hover:bg-surface-active-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy';

export default function Visitor() {
  const localize = useLocalize();
  const { data: startupConfig } = useGetStartupConfig();
  const [showSettings, setShowSettings] = useState(false);

  const helpUrl = startupConfig?.helpAndFaqURL;

  return (
    <div className="flex flex-col gap-0.5 pt-2">
      <a className={ROW} href="https://hanzo.ai/pricing" target="_blank" rel="noreferrer">
        <CreditCard className="icon-md" aria-hidden="true" />
        {localize('com_nav_plans')}
      </a>

      <button type="button" className={ROW} onClick={() => setShowSettings(true)}>
        <GearIcon className="icon-md" aria-hidden="true" />
        {localize('com_nav_settings')}
      </button>

      {helpUrl != null && helpUrl !== '/' && (
        <a className={ROW} href={helpUrl} target="_blank" rel="noreferrer">
          <CircleHelp className="icon-md" aria-hidden="true" />
          {localize('com_nav_help')}
        </a>
      )}

      {/* The offer, at the bottom-left corner the account block occupies once it
          is taken up. Sign-up leads — a visitor's most likely next step is to
          make an account, so it is the raised primary on TOP; log in sits under
          it, quieter, for the returning user who already knows to look. Both are
          hanzo.id; chat implements no account creation of its own. */}
      <div className="mt-2 flex flex-col gap-1">
        {/* Sign-up leads and is a real navigation (hanzo.id's app-scoped form),
            so it stays an anchor — right-click-open, crawlable — wearing the
            primary pushbutton look directly (the submit variant's tokens) rather
            than through asChild, which the resolved Button does not honor in
            every context. Log in triggers the OAuth redirect in JS, so it is a
            real button; outline keeps it the quieter second path underneath. */}
        <a
          href="https://hanzo.id/signup/hanzo-chat"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-surface-submit-hover bg-surface-submit px-2 text-sm font-medium text-white transition-colors hover:bg-surface-submit-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy"
        >
          {localize('com_auth_sign_up')}
        </a>
        <Button variant="outline" className="w-full" onClick={startHanzoLogin}>
          {localize('com_nav_log_in')}
        </Button>
      </div>

      {showSettings && <Settings open={showSettings} onOpenChange={setShowSettings} />}
    </div>
  );
}
