import { useState, memo, useCallback, useContext } from 'react';
import { FileText, UserCog, LayoutDashboard } from 'lucide-react';
import {
  UserMenu,
  resolveIdentity,
  type OrgState,
  type ThemeMode,
  type UserMenuItem,
} from '@hanzo/iam/react';
import { LinkIcon, GearIcon, ThemeContext, isDark } from '@hanzochat/client';
import { balanceOn } from '@hanzochat/data-provider';
import { MyFilesModal } from '~/components/Chat/Input/Files/MyFilesModal';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { startHanzoLogin } from '~/utils/login';
import { useLocalize } from '~/hooks';
import Settings from './Settings';

/**
 * The account control IS `@hanzo/iam`'s `UserMenu` — the same one every Hanzo
 * surface mounts. Identity, the org/team switcher, the balance, click-away, Escape
 * and close-before-navigate all live in the package; this file supplies only what
 * is chat's own: its Files and Settings modals, its links, and the org switch
 * (chat pins the active org server-side, then reloads).
 *
 * Identity is passed explicitly rather than read from `IamProvider`: chat logs in
 * through @hanzo/iam but the resulting session is a chat JWT owned by its own
 * AuthContext, and two providers for one session would be two sources of truth.
 */
function AccountSettings() {
  const localize = useLocalize();
  const { user, isAuthenticated, logout } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && balanceOn(startupConfig),
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  // One control, chat's store: the menu renders the light/dark/system choice and
  // chat's ThemeProvider remains the single writer of the applied theme.
  const { theme, setTheme } = useContext(ThemeContext);

  const currentOrg = user?.organization ?? '';
  const switchOrg = useCallback(async (organization: string) => {
    try {
      await fetch('/v1/chat/user/active-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization }),
        credentials: 'include',
      });
      window.location.reload();
    } catch (error) {
      console.error('[AccountSettings] org switch failed', error);
    }
  }, []);

  // chat's memberships come from its own user record (groups), not the IAM token —
  // the shape is the shared one so the switcher renders identically everywhere.
  const orgNames = [currentOrg, ...(user?.groups ?? [])].filter(
    (o, i, all) => !!o && all.indexOf(o) === i,
  );
  const orgState: OrgState | undefined = currentOrg
    ? {
        organizations: orgNames.map((name) => ({ owner: 'admin', name, displayName: name })),
        roles: {},
        currentRole: null,
        currentOrg: { owner: 'admin', name: currentOrg, displayName: currentOrg },
        currentOrgId: currentOrg,
        switchOrg: (org: string) => void switchOrg(org),
        projects: user?.project
          ? [{ owner: currentOrg, name: user.project, displayName: user.project }]
          : [],
        currentProject: null,
        currentProjectId: user?.project ?? null,
        switchProject: () => undefined,
        isLoading: false,
      }
    : undefined;

  const items: UserMenuItem[] = [
    {
      label: localize('com_nav_my_files'),
      icon: <FileText className="icon-md" aria-hidden="true" />,
      onSelect: () => setShowFiles(true),
    },
    ...(startupConfig?.helpAndFaqURL !== '/'
      ? ([
          {
            label: localize('com_nav_help_faq'),
            icon: <LinkIcon aria-hidden="true" />,
            href: startupConfig?.helpAndFaqURL,
            external: true,
          },
        ] as UserMenuItem[])
      : []),
    {
      label: 'Account',
      icon: <UserCog className="icon-md" aria-hidden="true" />,
      href: 'https://hanzo.id/account',
      external: true,
      separatorBefore: true,
    },
    {
      label: 'Console',
      icon: <LayoutDashboard className="icon-md" aria-hidden="true" />,
      href: 'https://console.hanzo.ai',
      external: true,
    },
    {
      label: localize('com_nav_settings'),
      icon: <GearIcon className="icon-md" aria-hidden="true" />,
      onSelect: () => setShowSettings(true),
    },
  ];

  // tokenCredits: 1,000,000 = $1 USD. An expired grant is spent, not held.
  const credits = balanceQuery.data?.tokenCredits;
  const expired = balanceQuery.data?.expiresAt
    ? new Date(balanceQuery.data.expiresAt) < new Date()
    : false;
  const usd = expired ? 0 : Number(credits ?? 0) / 1000000;
  const balance =
    balanceOn(startupConfig) && credits != null
      ? {
          amountUsd: usd,
          // SAY WHICH ZERO THIS IS. The amount alone cannot: a spent balance and
          // a lapsed trial both read "$0.00", and only one of them is about the
          // clock. This menu used to render the bare number, so a reader whose
          // grant had expired saw a plain zero and no reason for it — while the
          // Balance tab, on the same data, said "Credits expired". One fact, two
          // answers, and the one on the sidebar was the one people look at.
          //
          // `state` is the shared control's own vocabulary (ok | low | empty) —
          // it was simply never passed. `low` is under $2, matching the
          // threshold the Balance tab already warns at, so the two surfaces
          // change together instead of drifting.
          state: expired || usd <= 0 ? ('empty' as const) : usd < 2 ? ('low' as const) : ('ok' as const),
          label: expired ? localize('com_nav_balance') + ' · expired' : localize('com_nav_balance'),
          topUpLabel: 'Add Funds',
          topUpUrl: 'https://billing.hanzo.ai',
        }
      : undefined;

  return (
    <>
      <UserMenu
        identity={resolveIdentity(user as unknown as Record<string, unknown> | null, {})}
        isAuthenticated={isAuthenticated}
        onSignIn={startHanzoLogin}
        onSignOut={() => logout()}
        orgState={orgState}
        items={items}
        balance={balance}
        signOutLabel={localize('com_nav_log_out')}
        usageUrl="https://cloud.hanzo.ai/usage"
        brand={{ name: 'Hanzo AI', href: 'https://hanzo.ai' }}
        usageLabel="Usage & billing"
        theme={{
          mode: (theme as ThemeMode) ?? 'system',
          resolved: isDark(theme) ? 'dark' : 'light',
          setMode: (mode) => setTheme(mode),
        }}
        // The menu's own look comes from @hanzo/design (that is the point of the
        // shared control) — chat only flavors the trigger and the rows. The legacy
        // `.popover-ui` / `.account-settings-popover` classes are NOT passed: they
        // were written for ariakit's enter/leave lifecycle and set opacity:0.
        classNames={{
          trigger:
            'flex min-h-11 w-full items-center gap-2 rounded-xl p-2 text-sm transition-all duration-200 ease-in-out hover:bg-surface-active-alt aria-[expanded=true]:bg-surface-active-alt',
          item: 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-hover',
        }}
      />
      {showFiles && <MyFilesModal open={showFiles} onOpenChange={setShowFiles} />}
      {showSettings && <Settings open={showSettings} onOpenChange={setShowSettings} />}
    </>
  );
}

export default memo(AccountSettings);
