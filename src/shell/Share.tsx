import { Button, H2, Paragraph, Screen, YStack } from '@hanzo/ui'
import { Header as Bar } from '@hanzo/ui/chat'
import { useNavigate, useParams } from 'react-router'

import { useShared } from '~/data/share'
import { Waiting } from '~/shell/Boundary'
import { useTitle } from '~/shell/title'
import { Thread } from '~/thread/Thread'

/**
 * Somebody else's conversation, read-only.
 *
 * The ONE route in this client that takes no session, which is why it sits
 * outside the shell rather than inside it: no rail, no sign-in gate, no
 * palette. A visitor who was handed a link has no conversations to list and no
 * commands to run, and a product's whole chrome around a page they cannot use
 * reads as a wall rather than as a welcome.
 *
 * It renders the SAME `Thread` the live conversation does — the same turns, the
 * same code frames, the same reasoning disclosures — because a shared answer
 * that looks different from the answer is a shared answer nobody trusts. What
 * it does not render is anything that would change it: no composer, no edit, no
 * retry, no vote.
 *
 * One control, and it is an invitation rather than a nag: the way to start a
 * conversation of your own.
 */
export const Share = () => {
  const { shareId } = useParams()
  const shared = useShared(shareId)

  const navigate = useNavigate()
  useTitle(shared.data?.title)

  const gone = Boolean(shared.error) && !shared.data

  return (
    <Screen backgroundColor="$background">
      <Bar title={shared.data?.title || 'Shared conversation'}>
        <Button variant="outline" size="sm" onPress={() => navigate('/')}>
          Start your own chat
        </Button>
      </Bar>

      {gone ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$6">
          <YStack width="100%" maxWidth={420} gap="$3" alignItems="center">
            <H2 fontSize="$6" fontWeight="500" color="$color" textAlign="center">
              This link is not available
            </H2>
            {/* Withdrawn and never-existed are the same answer on purpose:
                telling a stranger which one it is says whether a conversation
                is there to be found. */}
            <Paragraph fontSize="$3" color="$color11" textAlign="center">
              It may have been withdrawn by whoever shared it, or the address may be wrong.
            </Paragraph>
            <Button variant="outline" onPress={() => navigate('/')}>
              Go to chat
            </Button>
          </YStack>
        </YStack>
      ) : shared.data ? (
        <Thread messages={shared.data.turns} />
      ) : (
        <Waiting>Opening the conversation…</Waiting>
      )}
    </Screen>
  )
}
