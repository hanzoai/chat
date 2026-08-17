import { memo } from 'react';
import { X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useAuthContext } from '~/hooks/AuthContext';
import { useDismissTourMutation } from '~/data-provider';

/**
 * The welcome card a new account meets on its first empty chat.
 *
 * Four lines, because the point is to name what is here — a model to pick,
 * sources to search, agents to run, a history to come back to — not to walk
 * anyone through it. It sits in the corner of the chat column and dims nothing:
 * the arrival modal was removed by owner call, and this is a greeting beside the
 * product rather than a gate in front of it.
 */
function Tour() {
  const localize = useLocalize();
  const { user, isAuthenticated } = useAuthContext();
  const dismiss = useDismissTourMutation();

  // `=== false`, not falsy. An account created before this card exists carries
  // no `toured` at all, and treating absent as "show it" would greet the whole
  // user base on the deploy that shipped this.
  if (!isAuthenticated || user?.toured !== false) {
    return null;
  }

  return (
    <div
      data-testid="tour"
      role="note"
      aria-label={localize('com_tour_title')}
      // In the flow, not over it. Floating this in the corner puts it on top of
      // the composer at every width: the composer block is `min-h-[280px]` at
      // the bottom of this column and its input is capped and centred, so the
      // gutter beside it is ~142px at 1440 and the card is 304px with its
      // margin. Sitting below the composer costs the empty landing some height
      // it has to spare, and cannot cover anything.
      className="mb-4 ml-auto mr-4 w-72 shrink-0 rounded-xl border border-border-medium bg-surface-secondary p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-primary">{localize('com_tour_title')}</p>
        <button
          type="button"
          onClick={() => dismiss.mutate()}
          aria-label={localize('com_tour_dismiss')}
          data-testid="tour-dismiss"
          className="-m-1 rounded-lg p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <X className="size-4" />
        </button>
      </div>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-text-secondary">
        <li>{localize('com_tour_model')}</li>
        <li>{localize('com_tour_sources')}</li>
        <li>{localize('com_tour_agents')}</li>
        <li>{localize('com_tour_history')}</li>
      </ul>
    </div>
  );
}

export default memo(Tour);
