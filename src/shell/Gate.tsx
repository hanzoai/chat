import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Anchor,
  Paragraph,
} from '@hanzo/ui'
import { useEffect, useState } from 'react'

import { api } from '../data/api.ts'
import { takePending, watchLogin, type Reason } from '../data/gate.ts'
import { MACHINE, origins } from '../data/origin.ts'
import { useSession } from '../data/session.tsx'

/**
 * Where somebody ready to pay goes. No price is repeated here: the plans page
 * reads the billing catalogue, and a number copied into a dialog is a number
 * that cannot know when the catalogue moves.
 */

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
 * It is an `AlertDialog`, not a `Dialog`, because Escape and a click outside are
 * refused: a refusal with nothing behind it should not be dismissable into a
 * product that cannot answer.
 *
 * It offers a way out exactly when there IS one. On this machine the engine
 * answers with no account, so a visitor refused by the estate has somewhere to
 * go — another model in the same picker — and the gate says so and stands
 * aside. Where there is no such origin, it is the wall it was.
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
  const free = origins().some((origin) => origin.id === MACHINE)

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
        {reason === 'limit' && api.plans ? (
          <Paragraph fontSize="$1" color="$color11">
            <Anchor
              href={api.plans}
              target="_blank"
              rel="noopener noreferrer"
              textDecorationLine="underline"
            >
              See what a plan includes
            </Anchor>
          </Paragraph>
        ) : null}

        {free ? (
          <Paragraph fontSize="$1" color="$color11">
            Or pick a model under “On this machine” — those run here, cost
            nothing and need no account.
          </Paragraph>
        ) : null}

        <AlertDialogFooter>
          {free ? <AlertDialogCancel onPress={() => setReason(null)}>Not now</AlertDialogCancel> : null}
          <AlertDialogAction variant="outline" onPress={signUp}>
            Create an account
          </AlertDialogAction>
          <AlertDialogAction onPress={signIn}>Log in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
