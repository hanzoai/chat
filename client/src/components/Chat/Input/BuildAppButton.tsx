import { memo, useCallback } from 'react';
import { AppWindow } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { useChatFormContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { openAppBuilder, cn } from '~/utils';

/**
 * Composer affordance that hands off to the hanzo.app builder — chat's sibling
 * product for building apps/websites. It opens hanzo.app in a new tab, seeded
 * with whatever is in the composer, so the intent carries over. Chat stays the
 * chat product; building lives at hanzo.app (the ONE build-app destination,
 * shared with the `/build` command, the starter chip, and the message action).
 */
function BuildAppButton() {
  const localize = useLocalize();
  const methods = useChatFormContext();
  const text = useWatch({ control: methods.control, name: 'text' });
  const openBuilder = useCallback(() => openAppBuilder(text), [text]);

  return (
    <button
      type="button"
      onClick={openBuilder}
      title={localize('com_ui_build_app')}
      className={cn(
        'group inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap',
        'rounded-full border border-border-medium px-3 text-sm font-medium',
        'bg-transparent text-text-primary shadow-sm transition-all',
        'hover:bg-surface-hover hover:shadow-md active:shadow-inner',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      <AppWindow className="icon-md" aria-hidden="true" />
      <span className="hidden sm:inline">{localize('com_ui_build_app')}</span>
    </button>
  );
}

export default memo(BuildAppButton);
