import { cn } from '~/utils';

type TSubRowProps = {
  children: React.ReactNode;
  classes?: string;
  subclasses?: string;
  pinned?: boolean;
  onClick?: () => void;
};

/**
 * The strip of actions under a turn.
 *
 * From `md` up the controls inside it are `opacity-0` until you point at the
 * turn, and an unpainted strip must not decide how far apart two turns sit. It
 * used to: 31px of strip plus 8px of offsets meant 39 of the 55px between a
 * user's bubble and the reply were blank by construction, and the transcript
 * read as unrelated blocks rather than as a conversation. Out of flow the strip
 * hangs in the room the row already keeps for it (`.hz-turn-row` in style.css),
 * so pointing at a turn moves nothing and the gap between two turns is the
 * strip's room rather than a hole above it.
 *
 * No `left` or `right`: an absolutely positioned flex child keeps the horizontal
 * place it would have had, so the strip follows its turn — right under a user's
 * bubble, left under a reply — without having to be told which one it is under.
 *
 * `pinned` is the last message, whose controls are always painted and so need
 * room of their own. It is the flag HoverButtons already uses to decide
 * painting, so the strip and its controls cannot disagree about being there.
 */
export default function SubRow({
  children,
  classes = '',
  pinned = false,
  onClick,
}: TSubRowProps) {
  return (
    <div
      className={cn(
        'mt-1 flex justify-start gap-3 empty:hidden lg:flex',
        !pinned && 'md:absolute md:top-full md:mt-0',
        classes,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
