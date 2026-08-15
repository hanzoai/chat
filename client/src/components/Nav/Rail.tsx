import { Clock, Folder, Globe, Puzzle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { ROW } from '~/components/chrome';

/**
 * The sidebar's destinations — Projects, Sites, Scheduled, Plugins — one row
 * each between the compose strip and the conversation list. Each row is a
 * route inside the shell (`/projects`, …) so the sidebar stays put and the
 * view swaps, the way `/agents` already behaves.
 *
 * Collapsed the rows narrow to their icon and the label moves to the native
 * tooltip. One component renders both states, so a destination added here
 * appears in both without anyone remembering to add it twice.
 *
 * Exported because the ⌘K palette offers the same destinations. Two lists would
 * be two lists to remember: the day one grows a row, the other silently stops
 * being able to reach it.
 */
export const PLACES = [
  { path: '/projects', label: 'com_nav_projects', Icon: Folder },
  { path: '/sites', label: 'com_nav_sites', Icon: Globe },
  { path: '/scheduled', label: 'com_nav_scheduled', Icon: Clock },
  { path: '/plugins', label: 'com_nav_plugins', Icon: Puzzle },
] as const;

export default function Rail({
  toggleNav,
  collapsed,
}: {
  toggleNav: () => void;
  collapsed?: boolean;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const localize = useLocalize();

  return (
    <div className="flex flex-col gap-0.5 pb-1">
      {PLACES.map(({ path, label, Icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            type="button"
            data-testid={`nav${path.replace('/', '-')}-button`}
            aria-current={active ? 'page' : undefined}
            title={collapsed === true ? localize(label) : undefined}
            className={cn(
              ROW,
              collapsed === true ? 'justify-center' : 'gap-2.5',
              active ? 'bg-surface-active-alt' : 'hover:bg-surface-active-alt',
            )}
            onClick={() => {
              navigate(path);
              toggleNav();
            }}
          >
            <Icon className="shrink-0 text-text-secondary" aria-hidden="true" />
            {collapsed !== true && localize(label)}
          </button>
        );
      })}
    </div>
  );
}
