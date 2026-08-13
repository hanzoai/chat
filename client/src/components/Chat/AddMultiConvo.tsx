import { PlusCircle } from 'lucide-react';
import { TooltipAnchor } from '@hanzochat/client';
import { isAssistantsEndpoint } from '@hanzochat/data-provider';
import type { TConversation } from '@hanzochat/data-provider';
import { useChatContext, useAddedChatContext } from '~/Providers';
import { mainTextareaId } from '~/common';
import { useLocalize } from '~/hooks';

function AddMultiConvo() {
  const { conversation } = useChatContext();
  const { setConversation: setAddedConvo } = useAddedChatContext();
  const localize = useLocalize();

  const clickHandler = () => {
    const { title: _t, ...convo } = conversation ?? ({} as TConversation);
    setAddedConvo({
      ...convo,
      title: '',
    } as TConversation);

    const textarea = document.getElementById(mainTextareaId);
    if (textarea) {
      textarea.focus();
    }
  };

  if (!conversation) {
    return null;
  }

  if (isAssistantsEndpoint(conversation.endpoint)) {
    return null;
  }

  return (
    <TooltipAnchor
      description={localize('com_ui_add_multi_conversation')}
      role="button"
      tabIndex={0}
      aria-label={localize('com_ui_add_multi_conversation')}
      onClick={clickHandler}
      data-testid="add-multi-convo-button"
      /* No open-state variant here: this control opens nothing — it adds a
       * second conversation column and returns. `[data-state=open]`, which that
       * variant selects on, was never going to appear on this button. */
      className="inline-flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-border-light bg-presentation text-text-primary transition-all ease-in-out hover:bg-surface-tertiary disabled:pointer-events-none disabled:opacity-50"
    >
      <PlusCircle className="icon-lg" aria-hidden="true" />
    </TooltipAnchor>
  );
}

export default AddMultiConvo;
