import { Anchor, Button, SizableText, XStack, YStack } from '@hanzo/ui'
import { accent } from '@hanzo/ui/glass'

/**
 * The foot of the rail for someone who is not signed in.
 *
 * It is `Account`'s counterpart and the two are mutually exclusive: the corner
 * belongs to whichever the session calls for, so there is never an account menu
 * with no account behind it.
 *
 * THE RAIL SAYS WHO YOU ARE, OR THAT YOU ARE NOBODY. Signed in the corner
 * carries a name; signed out it used to carry nothing, so a 56px column read
 * identically whether or not there was a session behind it — which is the one
 * question a person asks of a chat surface before typing into it. Collapsed,
 * what renders is the way IN and nothing else: the errands below are one press
 * away, because the mark above opens the column.
 *
 * Sign up is a real navigation to the issuer's app-scoped form, so it stays an
 * anchor — right-click-openable, and a link to a page rather than a script that
 * goes to one. Log in starts a redirect in JS, so it is a button. The two are
 * ordered by errand and weighted by offer: the returning reader's path reads
 * first because it is the shorter one, and the offer sits last because the eye
 * arrives at the bottom of a column.
 *
 * `accent` is the one loud control a surface is allowed, and it carries its own
 * foreground. Its halves are read off the recipe and placed where each applies
 * rather than spread whole, because the fill belongs to the box and the ink
 * belongs to the label — spelling either by hand is how a label ends up at
 * 1.07:1 on its own button.
 *
 * A row whose destination this deployment does not know does not render. There
 * is no guessing a URL, and no sending one brand's reader to another's prices.
 */
export interface VisitorProps {
  collapsed?: boolean
  onLogIn: () => void
  /** The issuer's app-scoped sign-up form. Absent → no second path is offered. */
  signupHref?: string
  onSettings?: () => void
  helpHref?: string
  plansHref?: string
}

const ROW = {
  minHeight: 36,
  paddingHorizontal: '$2',
  borderRadius: '$3',
} as const

function Row({ label, href, onPress }: { label: string; href?: string; onPress?: () => void }) {
  if (href) {
    return (
      <Anchor
        {...ROW}
        href={href}
        target="_blank"
        rel="noreferrer"
        textDecorationLine="none"
        paddingVertical="$2"
        fontSize="$2"
        color="$color11"
        hoverStyle={{ color: '$color12' }}
      >
        {label}
      </Anchor>
    )
  }
  return (
    <XStack
      {...ROW}
      role="button"
      tabIndex={0}
      cursor="pointer"
      alignItems="center"
      onPress={onPress}
      hoverStyle={{ backgroundColor: '$color3' }}
    >
      <SizableText fontSize="$2" color="$color11">
        {label}
      </SizableText>
    </XStack>
  )
}

export function Visitor({
  collapsed = false,
  onLogIn,
  signupHref,
  onSettings,
  helpHref,
  plansHref,
}: VisitorProps) {
  // A word fits where a glyph would need a package: "Log in" at the small rung
  // reads inside 56px, and it says what it does without a tooltip. It is a row
  // rather than a `Button` because a Button's horizontal padding comes from the
  // library's own rule at a specificity a style prop cannot argue with — 24px
  // of it, on a 40px content box.
  if (collapsed) {
    return (
      <YStack paddingTop="$2" borderTopWidth={1} borderColor="$borderColor">
        <XStack
          role="button"
          tabIndex={0}
          cursor="pointer"
          alignItems="center"
          justifyContent="center"
          minHeight={32}
          borderRadius="$3"
          onPress={onLogIn}
          hoverStyle={{ backgroundColor: '$color3' }}
          data-testid="rail-log-in"
        >
          <SizableText fontSize="$1" color="$color11">
            Log in
          </SizableText>
        </XStack>
      </YStack>
    )
  }

  return (
    <YStack
      paddingTop="$2"
      marginTop="$1"
      gap="$0.5"
      borderTopWidth={1}
      borderColor="$borderColor"
      data-testid="rail-visitor"
    >
      {plansHref ? <Row label="Plans" href={plansHref} /> : null}
      {onSettings ? <Row label="Settings" onPress={onSettings} /> : null}
      {helpHref ? <Row label="Help" href={helpHref} /> : null}

      <YStack marginTop="$2" gap="$1">
        <Button variant="ghost" onPress={onLogIn} data-testid="rail-log-in">
          Log in
        </Button>
        {signupHref ? (
          <Anchor
            href={signupHref}
            textDecorationLine="none"
            textAlign="center"
            fontSize="$3"
            fontWeight="500"
            color={accent.color}
            backgroundColor={accent.backgroundColor}
            borderWidth={accent.borderWidth}
            borderColor={accent.borderColor}
            borderRadius="$3"
            paddingVertical="$2.5"
            paddingHorizontal="$3"
            hoverStyle={{ backgroundColor: accent.hoverStyle.backgroundColor }}
            data-testid="rail-sign-up"
          >
            Sign up
          </Anchor>
        ) : null}
      </YStack>
    </YStack>
  )
}
