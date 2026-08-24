import { YStack } from '@hanzo/ui'
import { UserMenu, type UserMenuGroup, type UserMenuItem } from '@hanzo/ui/product'

/**
 * The foot of the rail for someone who IS signed in: who you are, and the
 * things you do to your account.
 *
 * `UserMenu` is the fleet's one account control. Five surfaces wrote their own
 * before it existed and disagreed about the trigger, the row order and the
 * sign-out copy; this is that menu, fed values.
 *
 * It OWNS ITS TRIGGER, and that is why `SidebarUser` is not mounted beside it:
 * two chips in one corner, one of which opens nothing, is worse than either
 * alone. The chip here is the menu's own — the same mark treatment a workspace
 * gets, the same 44px height, the same chevron — so "who I am" reads as a
 * control rather than as a caption.
 *
 * It opens UP and from the LEFT edge, because it sits at the foot of a column:
 * a panel that opens downward from a control 8px off the bottom of the viewport
 * has nowhere to go.
 *
 * Identity is a value and every row is an injected handler, so a row renders
 * only when the deployment can serve it — an honest menu, never a dead item.
 * `@hanzo/iam` stays for the auth verbs (signinRedirect, logout, the access
 * token) and is never asked for chrome.
 *
 * `theme={null}` because this app has one theme. A toggle over a choice that
 * does not exist is a control that appears to do nothing.
 */
export interface AccountProps {
  name: string
  email?: string
  /** Avatar URL. Absent → the menu draws the monogram, like an org's mark. */
  avatar?: string
  /** At 56px the name has no room; the mark alone still opens the menu. */
  collapsed?: boolean
  onFiles?: () => void
  onSettings?: () => void
  /** IAM owns the account page, and the avatar on it. We link, we do not edit. */
  accountHref?: string
  plansHref?: string
  helpHref?: string
  onSignOut?: () => void
}

const away = (href: string) => () => {
  if (typeof window !== 'undefined') window.open(href, '_blank', 'noopener')
}

export function Account({
  name,
  email,
  avatar,
  collapsed = false,
  onFiles,
  onSettings,
  accountHref,
  plansHref,
  helpHref,
  onSignOut,
}: AccountProps) {
  const mine: UserMenuItem[] = []
  if (onFiles) mine.push({ id: 'files', label: 'My files', onPress: onFiles })
  if (onSettings) mine.push({ id: 'settings', label: 'Settings', onPress: onSettings })
  if (accountHref) mine.push({ id: 'account', label: 'Account', onPress: away(accountHref) })

  const theirs: UserMenuItem[] = []
  if (plansHref) theirs.push({ id: 'plans', label: 'Plans', onPress: away(plansHref) })
  if (helpHref) theirs.push({ id: 'help', label: 'Help', onPress: away(helpHref) })

  const groups: UserMenuGroup[] = [mine, theirs]

  return (
    <YStack
      paddingTop="$2"
      marginTop="$1"
      borderTopWidth={1}
      borderColor="$borderColor"
      data-testid="rail-account"
    >
      <UserMenu
        name={name}
        email={email}
        avatar={avatar}
        groups={groups}
        theme={null}
        label={!collapsed}
        direction="up"
        align="start"
        onSignOut={onSignOut}
        testId="account-menu"
      />
    </YStack>
  )
}
