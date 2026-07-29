import AddedConvo from './AddedConvo';
import type { Setter } from '~/common';
import type { TConversation } from '@hanzochat/data-provider';

export default function TextareaHeader({
  addedConvo,
  setAddedConvo,
}: {
  addedConvo: TConversation | null;
  setAddedConvo: Setter<TConversation | null>;
}) {
  if (!addedConvo) {
    return null;
  }
  return (
    <div className="m-1.5 flex flex-col divide-y overflow-hidden rounded-b-lg rounded-t-2xl bg-surface-secondary-alt">
      <AddedConvo addedConvo={addedConvo} setAddedConvo={setAddedConvo} />
    </div>
  );
}
