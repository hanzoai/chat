import { memo, useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { X, ExternalLink, AppWindow } from 'lucide-react';
import { useSetRecoilState } from 'recoil';
import { useChatFormContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { openAppBuilder } from '~/utils';
import store from '~/store';

/**
 * SCAFFOLD (Phase 2) for the inline "build an app" experience: the side preview
 * pane that will eventually render the generated app. For now it is a placeholder
 * whose primary CTA is the "Open in App" handoff to the full hanzo.app builder,
 * seeded live from the composer text.
 *
 * Phase 3 (real inline codegen/preview) replaces the placeholder with a live
 * sandbox iframe. It needs: (1) a codegen/session endpoint the chat thread drives
 * (hanzo.app `/dev` codegen behind `/v1/`); (2) a sandbox preview URL to load into
 * the iframe; (3) a build-state channel (SSE) streaming file/preview updates.
 * Until then this hands off to hanzo.app so the experience stays uniform.
 */
function BuildPreviewPane() {
  const localize = useLocalize();
  const setBuildMode = useSetRecoilState(store.buildMode);
  const methods = useChatFormContext();
  const text = useWatch({ control: methods.control, name: 'text' });
  const openInApp = useCallback(() => openAppBuilder(text), [text]);
  const close = useCallback(() => setBuildMode(false), [setBuildMode]);

  return (
    <aside className="hidden h-full w-full max-w-[45%] flex-col border-l border-border-light bg-surface-primary md:flex">
      <div className="flex items-center justify-between border-b border-border-light px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <AppWindow className="icon-md" aria-hidden="true" />
          {localize('com_ui_build_app_preview')}
        </div>
        <button
          type="button"
          onClick={close}
          title={localize('com_ui_close')}
          aria-label={localize('com_ui_close')}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <X className="icon-md" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-border-medium bg-surface-secondary">
          <AppWindow className="h-7 w-7 text-text-secondary" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-primary">
            {localize('com_ui_build_app_preview_placeholder')}
          </p>
          <p className="mx-auto max-w-xs text-xs text-text-secondary">
            {localize('com_ui_build_app_preview_hint')}
          </p>
        </div>
        <button
          type="button"
          onClick={openInApp}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-submit px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-surface-submit-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ExternalLink className="icon-sm" aria-hidden="true" />
          {localize('com_ui_build_app_open_in_app')}
        </button>
      </div>
    </aside>
  );
}

export default memo(BuildPreviewPane);
