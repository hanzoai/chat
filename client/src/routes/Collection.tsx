import { Clock, Folder, Globe, Puzzle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalize } from '~/hooks';
import { HANZO_APP_BUILDER_URL } from '~/utils/buildApp';

const APP_ORIGIN = new URL(HANZO_APP_BUILDER_URL).origin;

/**
 * The view behind each sidebar destination (Rail). Management of these
 * concepts lives on its canonical surface — projects, sites and integrations
 * are hanzo.app's; scheduled runs come from agents — so each view names the
 * concept and hands off to the one place that owns it, the same doctrine
 * ProjectBanner follows. Chat links; it does not grow a second admin UI.
 */
const KINDS = {
  projects: {
    Icon: Folder,
    title: 'com_nav_projects',
    body: 'com_nav_projects_body',
    action: 'com_nav_projects_action',
    href: `${APP_ORIGIN}/projects`,
  },
  sites: {
    Icon: Globe,
    title: 'com_nav_sites',
    body: 'com_nav_sites_body',
    action: 'com_nav_sites_action',
    href: HANZO_APP_BUILDER_URL,
  },
  scheduled: {
    Icon: Clock,
    title: 'com_nav_scheduled',
    body: 'com_nav_scheduled_body',
    action: 'com_nav_scheduled_action',
    to: '/agents',
  },
  plugins: {
    Icon: Puzzle,
    title: 'com_nav_plugins',
    body: 'com_nav_plugins_body',
    action: 'com_nav_plugins_action',
    href: `${APP_ORIGIN}/integrations`,
  },
} as const;

export type CollectionKind = keyof typeof KINDS;

export default function Collection({ kind }: { kind: CollectionKind }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const spec = KINDS[kind];
  const { Icon } = spec;

  return (
    <main className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-tertiary">
        <Icon className="size-6 text-text-secondary" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-medium text-text-primary">{localize(spec.title)}</h1>
      <p className="max-w-sm text-sm text-text-secondary">{localize(spec.body)}</p>
      {'to' in spec ? (
        <button
          type="button"
          className="btn btn-primary mt-2"
          onClick={() => navigate(spec.to)}
        >
          {localize(spec.action)}
        </button>
      ) : (
        <a
          className="btn btn-primary mt-2"
          href={spec.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {localize(spec.action)}
        </a>
      )}
    </main>
  );
}
