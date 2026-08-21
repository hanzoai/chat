import { useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Share2 } from 'lucide-react';
import { TooltipAnchor } from '@hanzochat/client';
import { ShareButton } from '~/components/Conversations/ConvoOptions';
import { CONTROL } from '~/components/chrome';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

/**
 * Share — one button, one thing.
 *
 * This was a MENU of two: a share glyph that opened onto Share and Export.
 * Export is not a kind of sharing, it is one of the four things you can do to
 * the conversation, and it lives with the other three under the `⋯` now. What
 * is left needs no menu — a glyph that opens two rows, one of which is the glyph
 * itself, costs a click to say what the glyph already said.
 *
 * THE FILE NAME IS STALE and the rename is a follow-up, not an oversight:
 * `components/chrome.spec.ts` holds the list of files that draw a control in the
 * top row and reads each one off disk by path, so renaming this file makes that
 * suite fail to load. That list spans several parts of the app and has to be
 * curated as a whole.
 */
export default function Share({ enabled }: { enabled: boolean }) {
  const localize = useLocalize();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const conversation = useAtomValue(store.conversationByIndex(0));
  const conversationId = conversation?.conversationId;

  /* Nothing to share until the conversation exists on the server. */
  if (
    !enabled ||
    conversationId == null ||
    conversationId === 'new' ||
    conversationId === 'search'
  ) {
    return null;
  }

  return (
    <>
      <TooltipAnchor
        description={localize('com_ui_share')}
        render={
          <button
            ref={triggerRef}
            aria-label={localize('com_ui_share')}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            className={cn(CONTROL)}
          >
            <Share2 aria-hidden="true" focusable="false" />
          </button>
        }
      />
      <ShareButton
        triggerRef={triggerRef}
        conversationId={conversationId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
