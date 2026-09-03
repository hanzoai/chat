import { Anchor, Button, Checkbox, H2, Image, Label, Paragraph, XStack, YStack } from '@hanzo/ui'
import { useState } from 'react'

import { brand } from '~/brand'
import { useSession } from '~/data/session'
import { consent, usePref } from '~/settings/prefs'

/**
 * What an installed app asks before it opens, and it asks once.
 *
 * Both buttons record the same thing, because agreeing is what opens the app
 * and signing in is a separate question asked on the way through. Two verbs
 * that both advance is the fix for the screen this replaces, where signing in
 * did not advance at all — the login was fire-and-forget, nothing carried the
 * visitor past the screen, and the consent lived in component state, so it came
 * back at every launch and the whole surface was decoration.
 *
 * The terms are LINKED where the brand publishes some that answer, and named
 * without a link where it does not. A consent screen pointing at a 404 asks
 * somebody to agree to a page that is not there.
 */
export const Welcome = () => {
  const [, agree] = usePref(consent)
  const { signIn } = useSession()
  const [ticked, tick] = useState(false)

  const enter = () => agree(true)
  const enterAndSignIn = () => {
    agree(true)
    signIn()
  }

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      backgroundColor="$background"
    >
      <YStack width="100%" maxWidth={420} gap="$6">
        <YStack gap="$4">
          <Image src={brand.mark} alt={brand.name} width={40} height={40} borderRadius="$4" />
          <YStack gap="$2">
            <H2 fontSize="$6" fontWeight="500" color="$color">
              Welcome to {brand.title}
            </H2>
            <Paragraph fontSize="$3" color="$color11">
              Ask {brand.name} in the cloud, or a model running on this machine — that one costs
              nothing and needs no account.
            </Paragraph>
          </YStack>
        </YStack>

        {/* The real Checkbox, because this control gates the way in: a box with
            a tick drawn in it carries no role, no checked state and no focus,
            so a hand-rolled one locks keyboard and screen-reader users out of
            the app at its first screen. The id/htmlFor pair is what keeps the
            sentence clickable without a press handler around the row. */}
        <XStack gap="$3" alignItems="center">
          <Checkbox
            id="terms"
            checked={ticked}
            onCheckedChange={(next) => tick(next === true)}
          />
          <Label htmlFor="terms" fontSize="$3" color="$color11" flex={1}>
            I agree to the{' '}
            {brand.terms ? (
              <Anchor
                href={brand.terms}
                target="_blank"
                rel="noopener noreferrer"
                textDecorationLine="underline"
              >
                terms of service
              </Anchor>
            ) : (
              'terms of service'
            )}
            .
          </Label>
        </XStack>

        <YStack gap="$2">
          <Button variant="primary" disabled={!ticked} onPress={enterAndSignIn}>
            Sign in with {brand.name}
          </Button>
          <Button variant="ghost" disabled={!ticked} onPress={enter}>
            Carry on without an account
          </Button>
        </YStack>
      </YStack>
    </YStack>
  )
}
