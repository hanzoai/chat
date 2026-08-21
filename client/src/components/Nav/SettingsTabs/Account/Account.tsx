import React from 'react';
import { useAtom } from 'jotai';
import { ExternalLink } from 'lucide-react';
import DisplayUsernameMessages from './DisplayUsernameMessages';
import ImportConversations from './ImportConversations';
import DeleteAccount from './DeleteAccount';
import SharedLinks from './SharedLinks';
import { useLocalize } from '~/hooks';
import Avatar from './Avatar';
import store from '~/store';

const BILLING = 'https://billing.hanzo.ai';

/** The sign-off under the account row in the sidebar. It is how you appear, so
 *  it sits with the picture and the name rather than with the app's settings. */
function Signature() {
  const localize = useLocalize();
  const [signature, setSignature] = useAtom(store.signature);
  const labelId = 'signature-input-label';

  return (
    <div className="flex items-center justify-between gap-4">
      <div id={labelId} className="shrink-0">
        {localize('com_nav_signature')}
      </div>
      <input
        aria-labelledby={labelId}
        data-testid="signature-input"
        value={signature}
        maxLength={80}
        onChange={(e) => setSignature(e.target.value)}
        placeholder={localize('com_nav_signature_placeholder')}
        className="w-full max-w-[260px] rounded-md border border-border-light bg-surface-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-xheavy"
      />
    </div>
  );
}

/**
 * You, your things, and the two ways out.
 *
 * The balance dashboard that used to be two tabs of its own — a credit meter,
 * per-window token bars, a per-model spend breakdown and an auto-refill
 * schedule — is a link now. Money is decided at billing.hanzo.ai, and a second
 * rendering of the same ledger inside a chat window is a place for the two to
 * disagree.
 */
function Account() {
  const localize = useLocalize();

  return (
    <div className="flex flex-col gap-3 p-1 text-sm text-text-primary">
      <div className="pb-3">
        <Avatar />
      </div>
      <div className="pb-3">
        <DisplayUsernameMessages />
      </div>
      <div className="pb-3">
        <Signature />
      </div>
      <div className="pb-3">
        <SharedLinks />
      </div>
      <div className="pb-3">
        <ImportConversations />
      </div>
      <div className="flex items-center justify-between pb-3">
        <div>{localize('com_nav_setting_balance')}</div>
        <a
          href={BILLING}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-border-light bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-xheavy"
        >
          <ExternalLink className="h-4 w-4 text-text-secondary" aria-hidden="true" />
          {localize('com_ui_manage')}
        </a>
      </div>
      <div className="pb-3">
        <DeleteAccount />
      </div>
    </div>
  );
}

export default React.memo(Account);
