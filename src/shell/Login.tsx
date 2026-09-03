import { Button, H2, Paragraph, YStack } from '@hanzo/ui'
import { useEffect, useRef } from 'react'
import { Navigate, useSearchParams } from 'react-router'

import { brand } from '../brand'
import { useSession } from '../data/session'
import { Waiting } from './Boundary'

/**
 * Where a refusal sends somebody, and it is a DOOR rather than a page.
 *
 * There is no form here and there never will be: this app implements no login.
 * Arriving normally hands the browser straight to the issuer, which owns every
 * credential step — so the screen exists for the fraction of a second before
 * the navigation, and for the two cases where handing it over again would be
 * the wrong thing to do:
 *
 *   `?redirect=false`  somebody who just signed OUT was returned here by the
 *                      issuer. Bouncing them back would undo the thing they
 *                      asked for, in a loop they cannot get out of.
 *   `?error=…`         the last attempt did not complete. Retrying on sight
 *                      turns one failure into an infinite round trip between
 *                      two hosts, with nothing on screen long enough to read.
 *
 * The destination is NAMED, and named from the same organisation the session is
 * signed in against — written as a literal it once told somebody on lux.chat
 * "Redirecting to Hanzo…" while handing them to lux.id.
 */
export const Login = () => {
  const { standing, signIn } = useSession()
  const [params] = useSearchParams()

  const wait = params.get('redirect') === 'false'
  const failed = params.has('error')
  const stay = wait || failed
  const sent = useRef(false)

  useEffect(() => {
    if (stay || sent.current || standing !== 'guest') return
    sent.current = true
    signIn()
  }, [stay, standing, signIn])

  // Already somebody. The door is not for people who are through it.
  if (standing === 'live') return <Navigate to="/" replace />

  if (stay) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$6" backgroundColor="$background">
        <YStack width="100%" maxWidth={420} gap="$3" alignItems="center">
          <H2 fontSize="$6" fontWeight="500" color="$color" textAlign="center">
            {failed ? 'That sign-in did not finish' : `Signed out of ${brand.name}`}
          </H2>
          <Paragraph fontSize="$3" color="$color11" textAlign="center">
            {failed
              ? `${brand.name} did not complete the sign-in. Nothing was changed — try again, or carry on signed out.`
              : 'Your session has ended on this browser. Chat is still here signed out, with the free preview.'}
          </Paragraph>
          <Button variant="primary" onPress={signIn}>
            Log in
          </Button>
          <Button variant="ghost" onPress={() => window.location.assign('/')}>
            Carry on signed out
          </Button>
        </YStack>
      </YStack>
    )
  }

  return <Waiting>Taking you to {brand.name}…</Waiting>
}
