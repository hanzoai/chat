import { useState, memo, useCallback, useContext } from 'react';
import { useSetAtom } from 'jotai';
import { FileText, UserCog, LayoutDashboard, CreditCard } from 'lucide-react';
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
import { IAM_ACCOUNT_URL, IAM_ORG } from '~/utils/iam';
import { useLocalize } from '~/hooks';
import { ROW } from '~/components/chrome';
import { cn } from '~/utils';
import store from '~/store';

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
  // The dialog itself hangs off Root, because the ⌘K palette opens it too and
  // this block is gone at the collapsed rail. This menu only asks for it.
  const setShowSettings = useSetAtom(store.showSettings);
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
  // A project belongs to an organization, and `Project` says so — `organization`
  // is required. This built the array without it and then set `currentProject`
  // to a flat `null` while `currentProjectId` named a real project, so the
  // switcher was handed a malformed list AND told nothing was selected. It had
  // been a standing `tsc` error rather than a silent one; the type was right and
  // the object was wrong. One project, named once, used in both places.
  const project = user?.project
    ? {
        owner: currentOrg,
        name: user.project,
        displayName: user.project,
        organization: currentOrg,
      }
    : null;

  const orgState: OrgState | undefined = currentOrg
    ? {
        organizations: orgNames.map((name) => ({ owner: 'admin', name, displayName: name })),
        roles: {},
        currentRole: null,
        currentOrg: { owner: 'admin', name: currentOrg, displayName: currentOrg },
        currentOrgId: currentOrg,
        switchOrg: (org: string) => void switchOrg(org),
        projects: project ? [project] : [],
        currentProject: project,
        currentProjectId: project?.name ?? null,
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
      // The issuer this deployment actually signs in against — see utils/iam.
      href: IAM_ACCOUNT_URL,
      external: true,
      separatorBefore: true,
    },
    /* Hanzo's admin console, offered to Hanzo's tenant. There is no Lux console
       to send a Lux customer to — checked, `console.lux.network` does not
       resolve — so the row is HIDDEN rather than repointed at a guess or left
       pointing at another company's admin surface. Same rule the Plans row in
       Nav/Visitor already follows; it comes back for a brand the day that brand
       has one. */
    ...(IAM_ORG === 'hanzo'
      ? ([
          {
            label: 'Console',
            icon: <LayoutDashboard className="icon-md" aria-hidden="true" />,
            href: 'https://console.hanzo.ai',
            external: true,
          },
          /* The prices, offered to the people using the product.

             Nav/Visitor shows this row to a visitor who is not signed in, and
             this menu did not show it to anyone who was — so the reader with no
             account was told what it costs and the reader with one, who had
             actually used it, was not. The balance block below is not that row
             either: it renders only where balance is ON, which on hanzo.chat it
             is not, so a signed-in reader met no path to a plan at all.

             Same destination, string and icon as the visitor row: one price
             list, named once. `accent` because it is the only call to action in
             a menu of settings, and an anchor rather than `onSelect` so that
             cmd-click, middle-click and copy-link keep working. */
          {
            label: localize('com_nav_plans'),
            icon: <CreditCard className="icon-md" aria-hidden="true" />,
            href: 'https://hanzo.ai/pricing',
            external: true,
            variant: 'accent',
          },
        ] as UserMenuItem[])
      : []),
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
          state:
            expired || usd <= 0 ? ('empty' as const) : usd < 2 ? ('low' as const) : ('ok' as const),
          label: expired ? localize('com_nav_balance') + ' · expired' : localize('com_nav_balance'),
          topUpLabel: 'Add Funds',
          // Hanzo's checkout, for Hanzo's tenant. Inert on lux.chat today
          // (balance is off there, so this whole block is undefined), and stated
          // anyway: the day another brand turns balance on, an ungated literal
          // here would take that brand's customer to Hanzo's card form.
          topUpUrl: IAM_ORG === 'hanzo' ? 'https://billing.hanzo.ai' : undefined,
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
        /* Both are Hanzo's own surfaces and neither has a Lux counterpart
           (`billing.lux.network` and a Lux usage page do not exist), so they are
           omitted rather than repointed — the props are optional precisely so a
           surface can decline them.

           The brand strip is the sharper of the two, and @hanzo/iam says so in
           its own types: omitting `markSvg` falls back to the Hanzo mark from
           @hanzo/logo, so passing `{name: 'Lux Network'}` would have printed
           Lux's NAME under Hanzo's LOGO. Lux's mark set is raster and there is
           no SVG to hand it, so the honest answer is no strip at all — the
           footer already says "Powered by Lux Network" from CUSTOM_FOOTER. */
        usageUrl={IAM_ORG === 'hanzo' ? 'https://cloud.hanzo.ai/usage' : undefined}
        brand={IAM_ORG === 'hanzo' ? { name: 'Hanzo AI', href: 'https://hanzo.ai' } : undefined}
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
          // The account block takes the column's radius, ground and gap, but
          // NOT its height. `ROW` is 36 on a pointer because a conversation
          // list may be a hundred rows long; this is one row carrying an
          // avatar, a name and a balance, and at 36 those three are squeezed
          // into a line that reads as a caption rather than as the account.
          // 44 at every width, which is what it was before it was folded into
          // the shared row by mistake.
          trigger: cn(ROW, 'min-h-11 md:min-h-11', 'aria-[expanded=true]:bg-surface-active-alt'),
          item: 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-hover',
        }}
      />
      {showFiles && <MyFilesModal open={showFiles} onOpenChange={setShowFiles} />}
    </>
  );
}

export default memo(AccountSettings);
