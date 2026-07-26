import { useState, memo, useCallback } from 'react';
import { FileText, UserCog, LayoutDashboard } from 'lucide-react';
import { UserMenu, resolveIdentity, type OrgState, type UserMenuItem } from '@hanzo/iam/react';
import { LinkIcon, GearIcon } from '@hanzochat/client';
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
    enabled: !!isAuthenticated && startupConfig?.balance?.enabled,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

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
  const balance =
    startupConfig?.balance?.enabled === true && credits != null
      ? {
          amountUsd: expired ? 0 : Number(credits) / 1000000,
          label: localize('com_nav_balance'),
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
        classNames={{
          trigger:
            'flex h-auto w-full items-center gap-2 rounded-xl p-2 text-sm transition-all duration-200 ease-in-out hover:bg-surface-active-alt aria-[expanded=true]:bg-surface-active-alt',
          menu: 'account-settings-popover popover-ui absolute bottom-full left-0 z-[125] mb-2 w-[305px] overflow-hidden rounded-lg md:w-[244px]',
          section: 'border-b border-border-light px-3 py-2',
          item: 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-hover',
        }}
      />
      {showFiles && <MyFilesModal open={showFiles} onOpenChange={setShowFiles} />}
      {showSettings && <Settings open={showSettings} onOpenChange={setShowSettings} />}
    </>
  );
}

export default memo(AccountSettings);
