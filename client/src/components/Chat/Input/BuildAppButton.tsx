import { memo, useCallback } from 'react';
import { AppWindow } from 'lucide-react';
import { useRecoilState } from 'recoil';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

/**
 * Composer affordance that enters the inline "build an app" mode (split chat +
 * side preview). From the preview pane the user hands off to the full hanzo.app
 * builder ("Open in App"). Styled to match the composer's rounded badge chrome
 * so it reads as one system across chat -> app -> console.
 */
function BuildAppButton() {
  const localize = useLocalize();
  const [isBuildMode, setBuildMode] = useRecoilState(store.buildMode);
  const toggle = useCallback(() => setBuildMode((prev) => !prev), [setBuildMode]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isBuildMode}
      title={localize('com_ui_build_app')}
      className={cn(
        'group inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap',
        'rounded-full border border-border-medium px-3 text-sm font-medium',
        'bg-transparent text-text-primary shadow-sm transition-all',
        'hover:bg-surface-hover hover:shadow-md active:shadow-inner',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isBuildMode && 'border-border-heavy bg-surface-hover',
      )}
    >
      <AppWindow className="icon-md" aria-hidden="true" />
      <span className="hidden sm:inline">{localize('com_ui_build_app')}</span>
    </button>
  );
}

export default memo(BuildAppButton);
