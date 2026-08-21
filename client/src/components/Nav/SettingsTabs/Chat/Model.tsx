import ModelSelector from '~/components/Chat/Menus/Endpoints/ModelSelector';
import useChatHelpers from '~/hooks/Chat/useChatHelpers';
import { ChatContext } from '~/Providers/ChatContext';
import { useGetStartupConfig } from '~/data-provider';
import { useLocalize } from '~/hooks';

/**
 * Which model answers you.
 *
 * SECOND of two surfaces, and that is a known duplication awaiting a decision,
 * not a design. The composer now carries `ModelChip`, which opens the flat
 * `@` picker in two clicks against the six this row costs; this row's own note
 * used to say "nothing in the chat view offers to change that", and that is no
 * longer true. One of the two should go, and the argument for keeping this one
 * is narrow: `ModelSelector` is the only path to `SetKeyDialog`, the per-endpoint
 * API-key prompt, which opens when `endpointRequiresUserKey`. No endpoint in the
 * shipped config asks for a user key — all nine carry a server-injected
 * `{{CHAT_OPENID_TOKEN}}` — but that is a fact about the config in universe, not
 * a guarantee this repo makes.
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
