import { useAtom, useAtomValue } from 'jotai';
import { Files } from 'lucide-react';
import { TooltipAnchor, Button } from '@hanzochat/client';
import { CONTROL } from '~/components/chrome';
import { useLocalize } from '~/hooks';
import store from '~/store';

/**
 * Files and sources — the way into the panel beside the thread.
 *
 * That panel holds what the assistant PRODUCED here: documents, images, files,
 * links, previews of anything it made or opened. It used to be called the
 * canvas, and this control was `CanvasToggle` drawing a picture frame. Canvas
 * is retired — the word reads as a dated feature name rather than a description
 * of what is in the panel — so the control says what it opens and draws files.
 *
 * THE FILE NAME IS STALE and the rename is a follow-up, not an oversight:
 * `components/chrome.spec.ts` holds the list of files that draw a control in
 * the top row and reads each one off disk by path. That list spans several
 * parts of the app and has to be curated as a whole.
 *
 * It appears only when there is something to show, because a toggle for an
 * empty panel is a control that does nothing. The emptiness test is artifacts
 * only, which is narrower than the panel's new name: when the panel starts
 * carrying plain files and links as well, this test has to widen with it, and
 * that data belongs to the panel rather than to the header.
 */
export default function Sources() {
  const localize = useLocalize();
  const artifacts = useAtomValue(store.artifactsState);
  const [visible, setVisible] = useAtom(store.artifactsVisibility);

  if (artifacts == null || Object.keys(artifacts).length === 0) {
    return null;
  }

  const label = localize('com_ui_files_and_sources');
  return (
    <TooltipAnchor
      description={label}
      render={
        <Button
          size="icon"
          variant="outline"
          aria-label={label}
          aria-pressed={visible}
          data-testid="sources-button"
          className={CONTROL}
          onClick={() => setVisible((v) => !v)}
        >
          <Files aria-hidden="true" />
        </Button>
      }
    />
  );
}
