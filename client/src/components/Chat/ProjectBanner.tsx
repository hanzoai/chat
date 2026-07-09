import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SquarePen, LayoutGrid, X } from 'lucide-react';
import {
  persistProjectSlug,
  clearProjectSlug,
  appBuilderProjectUrl,
  consoleProjectUrl,
} from '~/utils/project';

/**
 * A slim bar shown while a conversation is scoped to a project (arrived via
 * `?project=<slug>`). It makes the scope visible and links the SAME project
 * back to the builder (hanzo.app) and console.hanzo.ai, completing the
 * console <-> hanzo.app <-> hanzo.chat round-trip. Renders nothing when no
 * project is active.
 */
export default function ProjectBanner() {
  const location = useLocation();
  const [slug, setSlug] = useState('');

  useEffect(() => {
    setSlug(persistProjectSlug(location.search));
  }, [location.search, location.pathname]);

  if (!slug) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-b border-border-light bg-surface-tertiary px-4 py-1.5 text-sm text-text-secondary">
      <span className="min-w-0 truncate">
        Project <span className="font-medium text-text-primary">{slug}</span>
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <a
          href={appBuilderProjectUrl(slug)}
          target="_blank"
          rel="noopener noreferrer"
          title="Edit this project in the hanzo.app builder"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface-hover hover:text-text-primary"
        >
          <SquarePen className="size-4" />
          <span className="hidden sm:inline">Edit in hanzo.app</span>
        </a>
        <a
          href={consoleProjectUrl(slug)}
          target="_blank"
          rel="noopener noreferrer"
          title="Manage this project in console.hanzo.ai"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface-hover hover:text-text-primary"
        >
          <LayoutGrid className="size-4" />
          <span className="hidden sm:inline">Console</span>
        </a>
        <button
          type="button"
          onClick={() => {
            clearProjectSlug();
            setSlug('');
          }}
          title="Exit project scope"
          aria-label="Exit project scope"
          className="rounded-md p-1 hover:bg-surface-hover hover:text-text-primary"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
