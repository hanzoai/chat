import { useAtom, useAtomValue } from 'jotai';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { TooltipAnchor, Button } from '@hanzochat/client';
import { CONTROL } from '~/components/chrome';
import { useLocalize } from '~/hooks';
import store from '~/store';

/**
 * The canvas toggle — the right edge's mirror of the left sidebar button.
 *
 * The left button opens the conversation rail; this one opens the CANVAS: the
 * panel beside the thread where a document, a deck, a spreadsheet, a site
 * preview, an image lives (whatever the model produced as an artifact). Two
 * edges, two panels, one symmetric pair.
 *
 * It appears only when there is a canvas to show — an artifact exists — because
 * a toggle for an empty panel is a control that does nothing. Open, it closes
 * the canvas; closed, it reopens it. The panel itself is the existing
 * ArtifactsPanel; this is the affordance the header was missing.
 */
export default function CanvasToggle() {
  const localize = useLocalize();
  const artifacts = useAtomValue(store.artifactsState);
  const [visible, setVisible] = useAtom(store.artifactsVisibility);

  const hasCanvas = artifacts != null && Object.keys(artifacts).length > 0;
  if (!hasCanvas) {
    return null;
  }

  const label = visible ? localize('com_ui_canvas_hide') : localize('com_ui_canvas_show');
  return (
    <TooltipAnchor
      description={label}
      render={
        <Button
          size="icon"
          variant="outline"
          aria-label={label}
          aria-pressed={visible}
          data-testid="canvas-toggle-button"
          className={CONTROL}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <PanelRightClose aria-hidden="true" /> : <PanelRight aria-hidden="true" />}
        </Button>
      }
    />
  );
}
