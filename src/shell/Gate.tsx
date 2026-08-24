import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Anchor,
  Paragraph,
} from '@hanzo/ui'
import { useEffect, useState } from 'react'

import { takePending, watchLogin, type Reason } from '~/data/gate'
import { useSession } from '~/data/session'

/**
 * Where somebody ready to pay goes. No price is repeated here: the plans page
 * reads the billing catalogue, and a number copied into a dialog is a number
 * that cannot know when the catalogue moves.
 */
const PLANS = 'https://hanzo.ai/pricing'

/** What each refusal actually means to the person reading it. */
const copy: Record<Reason, { title: string; message: string }> = {
  limit: {
    title: 'That is the whole free preview',
    message:
      'Sign in to keep going. Everything you have said so far comes with you, and the account is free.',
  },
  anonymous: {
    title: 'Sign in to carry on',
    message:
      'This needs an account — answers are metered against your own balance, so there has to be somebody to meter.',
  },
  // The signed-out preview itself was refused, so there is no anonymous product
  // behind this to explain away. Saying so beats what used to happen here: a
  // marketing page with no composer on it and no reason given.
  unavailable: {
    title: 'The preview is not available',
    message:
      'The signed-out preview could not be started just now. An account works either way and takes a moment.',
  },
}

/**
 * The ONE sign-in gate.
 *
 * It stands in for the raw server error a refused request would otherwise
 * render as if it were a reply — the difference between "That is the whole free
 * preview" and a message bubble reading `Unauthorized`, which is what the tree
 * this replaces actually shipped. It offers the existing Hanzo IAM login; it
 * does not implement one.
 *
 * It is an `AlertDialog`, not a `Dialog`, and the whole point is what that
 * takes AWAY. Escape is refused, a click outside is refused, and there is no
 * cancel — so the empty `onOpenChange={() => {}}` and the `showCancelButton={false}`
 * that used to say all that go with it. Every reason here is a REFUSAL with
 * nothing behind it to go back to, so dismissing it would leave somebody on a
 * product that cannot answer them, with no explanation of why.
 *
 * `takePending` runs in an effect rather than in a `useState` initializer.
 * Identity settles before the shell paints — a refused guest answers in
 * milliseconds while this is still mounting — so the reason is HELD, and
 * reading consumes it. An initializer would consume it during a StrictMode
 * double render and the gate would open showing nothing.
 */
export const Gate = () => {
  const [reason, setReason] = useState<Reason | null>(null)
  const { signIn, signUp } = useSession()

  useEffect(() => {
    const held = takePending()
    if (held) setReason(held)
    return watchLogin(setReason)
  }, [])

  if (!reason) return null
  const { title, message } = copy[reason]

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* Only where the product has actually been used. Somebody who spent the
            preview has a reason to weigh a plan; somebody who never got a reply
            has not earned the question yet, and asking anyway is how a gate
            starts reading as a toll booth. */}
        {reason === 'limit' ? (
          <Paragraph fontSize="$1" color="$color11">
            <Anchor
              href={PLANS}
              target="_blank"
              rel="noopener noreferrer"
              textDecorationLine="underline"
            >
              See what a plan includes
            </Anchor>
          </Paragraph>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogAction variant="outline" onPress={signUp}>
            Create an account
          </AlertDialogAction>
          <AlertDialogAction onPress={signIn}>Log in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
