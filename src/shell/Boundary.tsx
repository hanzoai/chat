import { Button, H2, Paragraph, SizableText, Spinner, YStack } from '@hanzo/ui'
import type { ReactNode } from 'react'

/**
 * What renders when the screen cannot.
 *
 * Two of them, and they are one idea at two speeds: a screen that has not
 * arrived yet, and a screen that is not going to. Both belong to the shell,
 * because both stand IN PLACE OF a route rather than inside one.
 *
 * Neither is `EmptyState`. That component is the dashed first-run card for a
 * list that loaded and came back empty — a success with nothing in it — and
 * says so itself. A crash is not an onboarding moment.
 */

/**
 * The wait.
 *
 * The spinner is `aria-hidden` by construction, so the SENTENCE carries the
 * message and is not optional: a lone spinner tells somebody using speech that
 * something is happening, never what, and never when to give up on it.
 */
export const Waiting = ({ children }: { children: ReactNode }) => (
  <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$6">
    <Spinner size={20} color="$color11" />
    <SizableText fontSize="$2" color="$color11">
      {children}
    </SizableText>
  </YStack>
)

/**
 * The refusal — a route that threw on its way to the screen.
 *
 * One sentence, one way out, and deliberately nothing about what broke: no
 * status code, no stack trace, no "download error logs". The tree this replaces
 * printed exactly that panel at addresses people TYPE, so a mistyped URL read
 * as a crashed product. Whoever is debugging has the console, which is where a
 * stack belongs.
 *
 * The way out is a full load rather than a client-side navigation, because the
 * state that broke is the state a navigation would carry with it.
 */
export const Boundary = () => (
  <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" backgroundColor="$background">
    <YStack width="100%" maxWidth={420} gap="$3" alignItems="center">
      <H2 fontSize="$6" fontWeight="500" color="$color" textAlign="center">
        That did not load
      </H2>
      <Paragraph fontSize="$3" color="$color11" textAlign="center">
        Something went wrong drawing this screen. Your conversations are safe — they are kept on
        the server, not in this page.
      </Paragraph>
      <Button variant="outline" onPress={() => window.location.assign('/')}>
        Back to chat
      </Button>
    </YStack>
  </YStack>
)
