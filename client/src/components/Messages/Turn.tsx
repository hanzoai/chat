import { memo, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import PlaceholderRow from '~/components/Chat/Messages/ui/PlaceholderRow';
import { USER_TURN, chatWidth, turnColumn } from '~/common/turn';
import { cn } from '~/utils';
import store from '~/store';

/**
 * One turn's frame: who is speaking, how wide it runs, and where the action
 * strip goes. The body is `children`.
 *
 * This was written out three times — ContentRender, MessageRender and
 * MessageParts — and the three differed only in which body renderer they
 * called. `common/turn.ts` had already pulled the class strings out of them,
 * which left three components carrying identical markup around one varying
 * child. This is that child made explicit.
 *
 * The props are `@hanzo/ui/chat`'s `Message` contract — `role`, `children`,
 * `actions`, `busy` — deliberately, so adopting the shell here is one file
 * rather than three. Two of them are why it is not adopted yet: `Message`
 * takes no `id` and no accessible name, so a turn rendered by the shell today
 * cannot be addressed by the scroll machinery or announced by a screen reader.
 * The user bubble's ground is also fixed at `$color3` there, where this is the
 * fleet's `glass` material and runs to a wider measure.
 */
export type Role = 'user' | 'assistant';

export interface TurnProps {
  role: Role;
  /** Addresses the turn: anchors, scroll targets, `document.getElementById`. */
  id?: string | null;
  /** The turn's accessible name. */
  label?: string;
  /** The turn itself. */
  children?: ReactNode;
  /** The strip under the turn — siblings, copy, retry, feedback. */
  actions?: ReactNode;
  /** Still streaming: hold the strip's height open rather than render it. */
  busy?: boolean;
  /** Content renders beside the reply, so the column takes the wider track. */
  wide?: boolean;
}

export const Turn = memo(function Turn({
  role,
  id,
  label,
  children,
  actions,
  busy = false,
  wide = false,
}: TurnProps) {
  const maximize = useAtomValue(store.maximizeChatSpace);
  const mine = role === 'user';

  return (
    <div
      id={id ?? undefined}
      aria-label={label}
      className={cn(
        'group mx-auto flex flex-1 gap-3 transition-all duration-300 transform-gpu',
        chatWidth({ maximize, parallel: wide }),
        'focus:outline-none focus:ring-2 focus:ring-border-xheavy',
        'message-render',
      )}
    >
      {/* No avatar, no sender name (owner call): identity chrome is dropped.
          The user's own turn is a glass bubble on the right; the reply is
          plain and full width — that contrast is what says who is speaking. */}
      <div className={cn('relative flex w-full flex-col', mine ? 'user-turn' : 'agent-turn')}>
        <div className={turnColumn(mine)}>
          <div className={cn('flex max-w-full flex-grow flex-col gap-0', mine && USER_TURN)}>
            {children}
          </div>
          {busy ? <PlaceholderRow /> : actions}
        </div>
      </div>
    </div>
  );
});

export default Turn;
