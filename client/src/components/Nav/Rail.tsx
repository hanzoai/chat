import { Clock, Folder, Globe, Puzzle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * The sidebar's destinations — Projects, Sites, Scheduled, Plugins — one row
 * each between the compose strip and the conversation list. Each row is a
 * route inside the shell (`/projects`, …) so the sidebar stays put and the
 * view swaps, the way `/agents` already behaves.
 */
const PLACES = [
  { path: '/projects', label: 'com_nav_projects', Icon: Folder },
  { path: '/sites', label: 'com_nav_sites', Icon: Globe },
  { path: '/scheduled', label: 'com_nav_scheduled', Icon: Clock },
  { path: '/plugins', label: 'com_nav_plugins', Icon: Puzzle },
] as const;

export default function Rail({ toggleNav }: { toggleNav: () => void }) {
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
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg p-2 text-sm text-text-primary transition-colors duration-200',
              active ? 'bg-surface-active-alt' : 'hover:bg-surface-active-alt',
            )}
            onClick={() => {
              navigate(path);
              toggleNav();
            }}
          >
            <Icon className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
            {localize(label)}
          </button>
        );
      })}
    </div>
  );
}
