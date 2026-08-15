import ModelSelector from '~/components/Chat/Menus/Endpoints/ModelSelector';
import useChatHelpers from '~/hooks/Chat/useChatHelpers';
import { ChatContext } from '~/Providers/ChatContext';
import { useGetStartupConfig } from '~/data-provider';
import { useLocalize } from '~/hooks';

/**
 * Which model answers you.
 *
 * Enso is the house model and leads the endpoint's list, so a new conversation
 * is already on it and nothing in the chat view offers to change that. This row
 * is where the change is made — one setting among the others, chosen
 * deliberately rather than in passing.
 *
 * The picker is the app's one `ModelSelector`, unchanged: it reads the endpoints
 * and models the deployment actually serves, and hides itself when the
 * deployment turns model choice off. No list is written here.
 *
 * It reaches the open conversation through `ChatContext`, which the chat view
 * supplies to its own tree. This dialog is mounted beside that tree rather than
 * inside it (`routes/Root.tsx`), so it builds the same helpers over the same
 * conversation atoms — `useChatHelpers(0)` is what `ChatView` calls, and the
 * state it hands back is the state the view is already reading.
 */
export default function Model() {
  const localize = useLocalize();
  const { data: startupConfig } = useGetStartupConfig();
  const chatHelpers = useChatHelpers(0);

  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div>{localize('com_ui_model')}</div>
      <div className="w-[220px]">
        <ChatContext.Provider value={chatHelpers}>
          <ModelSelector startupConfig={startupConfig} />
        </ChatContext.Provider>
      </div>
    </div>
  );
}
