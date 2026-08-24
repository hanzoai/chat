/**
 * The empty conversation.
 *
 * A heading, a line under it, and — if the surface has any — a few things worth
 * asking. Not a landing page: the marketing site is the marketing site, and the
 * version of this that carried a video backdrop, a tour and a headline coupled
 * to which clip was playing is exactly what a first screen should not be.
 *
 * Centred by its parent, so this component stays a column of text and the
 * screen decides where a screen's worth of nothing sits.
 */
import { Button, H2, Paragraph, XStack, YStack } from '@hanzo/ui'

export interface GreetingProps {
  /** Who is being greeted. Absent, the greeting is impersonal, not broken. */
  name?: string
  hint?: string
  /** Openers worth a press. */
  prompts?: string[]
  onPick?: (prompt: string) => void
}

export const Greeting = ({
  name,
  hint = 'Ask anything.',
  prompts,
  onPick,
}: GreetingProps) => (
  <YStack alignItems="center" gap="$3" maxWidth={640} width="100%">
    <H2 size="$8" textAlign="center">
      {name ? `Hello, ${name}` : 'Hello'}
    </H2>
    <Paragraph color="$quiet" textAlign="center">
      {hint}
    </Paragraph>

    {prompts && prompts.length > 0 && onPick ? (
      <XStack gap="$2" flexWrap="wrap" justifyContent="center" paddingTop="$2">
        {prompts.map((prompt) => (
          <Button key={prompt} variant="outline" size="sm" onPress={() => onPick(prompt)}>
            {prompt}
          </Button>
        ))}
      </XStack>
    ) : null}
  </YStack>
)
