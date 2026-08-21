import { memo, useRef, useMemo, useState, useCallback } from 'react';
import { TextareaAutosize } from '@hanzochat/client';
import { useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { Constants, isAssistantsEndpoint } from '@hanzochat/data-provider';
import {
  useChatContext,
  useChatFormContext,
  useAssistantsMapContext,
  BadgeRowProvider,
} from '~/Providers';
import {
  useTextarea,
  useAutoSave,
  useLocalize,
  useRequiresKey,
  useHandleKeyUp,
  useQueryParams,
  useSubmitMessage,
  useFocusChatEffect,
} from '~/hooks';
import { useRunCloudAgent } from '~/hooks/Agents';
import { command as backdrop } from '~/utils/backdrop';
import { mainTextareaId } from '~/common';
import FileFormChat from './Files/FileFormChat';
import {
  cn,
  removeFocusRings,
  parseAgentCommand,
  parseBuildCommand,
  openAppBuilder,
} from '~/utils';
import { COLUMN } from '~/components/chrome';
import PromptsCommand from './PromptsCommand';
import AgentsCommand from './AgentsCommand';
import StreamAudio from './StreamAudio';
import ToolDialogs from './ToolDialogs';
import ComposerShell from './ComposerShell';
import SendButton from './SendButton';
import Mention from './Mention';
import Chips from './Chips';
import Add from './Add';
import Mic from './Mic';
import store from '~/store';

/**
 * The composer.
 *
 * Three controls and a field, and the count is the point. What used to sit here
 * — a badge per tool, a menu of parameters, a model-and-preset picker on "+",
 * an artifacts mode, a pin per badge and an edit mode for arranging them —
 * asked the reader to hold a model of the machine before they could write a
 * sentence. Each of those concepts still exists; none of them is a question
 * this row asks. A tool is something you add to a turn, the model is a setting,
 * and a preset is a Project.
 *
 * `＋` is everything that can go INTO the turn — a file, or a tool — because a
 * person opening it has one question and two menus would make them ask which.
 * A tool it turns on becomes a chip above the field, so the turn never carries
 * anything invisible. The mic dictates and the arrow sends. Nothing else, at
 * any width, in any state.
 */
const ChatForm = memo(({ index = 0 }: { index?: number }) => {
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useFocusChatEffect(textAreaRef);
  const localize = useLocalize();

  const [, setIsScrollable] = useState(false);
  // While dictation is live the recorder takes the whole action row, so the
  // add/tools cluster and its spacer step aside — the waveform reads full
  // width instead of a thumbnail wedged against the send button.
  const [recording, setRecording] = useState(false);

  const TextToSpeech = useAtomValue(store.textToSpeech);
  const chatDirection = useAtomValue(store.chatDirection);
  const automaticPlayback = useAtomValue(store.automaticPlayback);
  const maximizeChatSpace = useAtomValue(store.maximizeChatSpace);
  const isTemporary = useAtomValue(store.isTemporary);

  const setShowPlusPopover = useSetAtom(store.showPlusPopoverFamily(index));
  const [showMentionPopover, setShowMentionPopover] = useAtom(
    store.showMentionPopoverFamily(index),
  );
  const setShowAgentsPopover = useSetAtom(store.showAgentsPopoverFamily(index));

  const { requiresKey } = useRequiresKey();
  const methods = useChatFormContext();
  const { files, setFiles, conversation, isSubmitting, filesLoading, newConversation } =
    useChatContext();
  const assistantMap = useAssistantsMapContext();

  const endpoint = useMemo(
    () => conversation?.endpointType ?? conversation?.endpoint,
    [conversation?.endpointType, conversation?.endpoint],
  );
  const conversationId = useMemo(
    () => conversation?.conversationId ?? Constants.NEW_CONVO,
    [conversation?.conversationId],
  );

  /** New-conversation empty state: enlarge + center the composer (hanzo.ai hero). */
  const isLanding = useMemo(
    () =>
      (conversationId == null || conversationId === Constants.NEW_CONVO) &&
      !isSubmitting &&
      conversation?.messages?.length === 0,
    [conversationId, isSubmitting, conversation?.messages?.length],
  );

  const isRTL = useMemo(
    () => (chatDirection != null ? chatDirection?.toLowerCase() === 'rtl' : false),
    [chatDirection],
  );
  const invalidAssistant = useMemo(
    () =>
      isAssistantsEndpoint(endpoint) &&
      (!(conversation?.assistant_id ?? '') ||
        !assistantMap?.[endpoint ?? '']?.[conversation?.assistant_id ?? '']),
    [conversation?.assistant_id, endpoint, assistantMap],
  );
  const disableInputs = useMemo(
    () => requiresKey || invalidAssistant,
    [requiresKey, invalidAssistant],
  );

  const handleContainerClick = useCallback(() => {
    /** Check if the device is a touchscreen */
    if (window.matchMedia?.('(pointer: coarse)').matches) {
      return;
    }
    textAreaRef.current?.focus();
  }, []);

  useAutoSave({
    files,
    setFiles,
    textAreaRef,
    conversationId,
    isSubmitting,
  });

  const { submitMessage, submitPrompt } = useSubmitMessage();
  const runCloudAgent = useRunCloudAgent();
  // Read and write without subscribing: the composer must not re-render every
  // time the backdrop changes.
  const atoms = useStore();

  /**
   * Submit handler for text TYPED INTO THIS COMPOSER. It intercepts the slash
   * commands — `/agent <name> [prompt]`, `/background` — and turns each into its
   * one action; everything else is a normal chat message. This is the ONE place
   * each of those commands is read. `/build` is read a step earlier, in
   * `submit`, for the reason given there.
   */
  const onSubmit = useCallback(
    (data?: { text: string }) => {
      const text = data?.text ?? '';
      const command = parseAgentCommand(text);
      if (command) {
        methods.reset();
        setShowAgentsPopover(false);
        void runCloudAgent(command.name, command.prompt);
        return;
      }
      /**
       * `/background` (and `/bg`) never reach the model.
       *
       * It is read HERE, with the other commands, because this callback runs on
       * text the viewer typed into this composer and on nothing else. The send
       * it delegates to is reached by three other things — a conversation
       * starter an agent wrote, a prompt somebody shared, a `?prompt=` in a link
       * — and a command read there would let any of them redress a stranger's
       * chat, and point an `<img>` at a host of their choosing, from a link.
       *
       * A line that names nothing usable comes back null and is SENT, so the
       * viewer sees for themselves that nothing was applied.
       */
      const next = backdrop(text, atoms.get(store.backdrop));
      if (next) {
        methods.reset();
        atoms.set(store.backdrop, next);
        return;
      }
      submitMessage(data);
    },
    [methods, runCloudAgent, submitMessage, setShowAgentsPopover, atoms],
  );

  /**
   * The form's submit. `/build [prompt]` is read HERE, ahead of `handleSubmit`,
   * because the builder opens a tab and a tab opens only inside the gesture that
   * asked for it: `handleSubmit` awaits validation before it calls back, and a
   * phone browser drops a `window.open` that lands after that await — composer
   * cleared, no builder, nothing said. Everything else submits as it did.
   */
  const submit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      const buildPrompt = parseBuildCommand(methods.getValues('text'));
      if (buildPrompt !== null) {
        e.preventDefault();
        openAppBuilder(buildPrompt);
        methods.reset();
        return;
      }
      void methods.handleSubmit(onSubmit)(e);
    },
    [methods, onSubmit],
  );

  const handleKeyUp = useHandleKeyUp({
    index,
    textAreaRef,
    setShowPlusPopover,
    setShowMentionPopover,
  });
  const {
    isNotAppendable,
    handlePaste,
    handleKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
  } = useTextarea({
    textAreaRef,
    submitButtonRef,
    setIsScrollable,
    disabled: disableInputs,
  });

  useQueryParams({ textAreaRef });

  const { ref, ...registerProps } = methods.register('text', {
    required: true,
    onChange: useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        methods.setValue('text', e.target.value, { shouldValidate: true }),
      [methods],
    ),
  });

  return (
    <form
      onSubmit={submit}
      className={cn(
        'mx-auto flex w-full flex-row gap-3 transition-[max-width] duration-300 sm:mb-10 sm:px-2',
        COLUMN(maximizeChatSpace),
      )}
    >
      <div className="relative flex h-full flex-1 items-stretch md:flex-col">
        <div className={cn('flex w-full items-center', isRTL && 'flex-row-reverse')}>
          {showMentionPopover && (
            <Mention
              conversation={conversation}
              setShowMentionPopover={setShowMentionPopover}
              newConversation={newConversation}
              textAreaRef={textAreaRef}
            />
          )}
          <PromptsCommand index={index} textAreaRef={textAreaRef} submitPrompt={submitPrompt} />
          <AgentsCommand index={index} textAreaRef={textAreaRef} />
          <ComposerShell
            onClick={handleContainerClick}
            temporary={isTemporary}
            className="flex-grow pb-4 sm:pb-0"
          >
            <BadgeRowProvider
              conversationId={conversationId}
              specName={conversation?.spec}
              isSubmitting={isSubmitting}
            >
              <FileFormChat conversation={conversation} />
              <Chips textAreaRef={textAreaRef} />
              {endpoint && (
                <TextareaAutosize
                  {...registerProps}
                  ref={(e) => {
                    ref(e);
                    (textAreaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                  }}
                  disabled={disableInputs || isNotAppendable}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  id={mainTextareaId}
                  tabIndex={0}
                  data-testid="text-input"
                  rows={1}
                  aria-label={localize('com_ui_message_input')}
                  style={{ height: isLanding ? 46 : 44, overflowY: 'auto' }}
                  className={cn(
                    'm-0 w-full resize-none bg-transparent px-5 py-[13px] placeholder-black/50 dark:placeholder-white/50 md:py-3.5',
                    'max-h-[45vh] md:max-h-[55vh]',
                    removeFocusRings,
                    'scrollbar-hover transition-[max-height] duration-200 disabled:cursor-not-allowed',
                    isLanding && 'text-[15px]',
                  )}
                />
              )}
              <div
                className={cn(
                  'composer-actions flex items-center gap-2 pb-2',
                  isRTL ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                {/* Hidden while dictating so the waveform owns the full row. */}
                {!recording && (
                  <>
                    <div className={isRTL ? 'mr-2' : 'ml-2'}>
                      <Add conversation={conversation} disabled={disableInputs} />
                    </div>
                    <div className="mx-auto flex" />
                  </>
                )}
                {/* The mic is a core composer control — always present. It
                    self-disables and names the reason when dictation is
                    unavailable (Brave ships speech off). Gating its existence
                    behind the STT setting silently stripped it from anyone whose
                    stored value was off, and left no affordance to discover
                    dictation; the Speech settings still tune it. */}
                <Mic disabled={disableInputs || isNotAppendable} onRecordingChange={setRecording} />
                <div className={isRTL ? 'ml-2' : 'mr-2'}>
                  {/* No stop circle (owner call): the send arrow holds its seat,
                      disabled while the reply streams; the mic carries the
                      voice state in its own color. */}
                  {endpoint && (
                    <SendButton
                      ref={submitButtonRef}
                      control={methods.control}
                      disabled={filesLoading || isSubmitting || disableInputs || isNotAppendable}
                    />
                  )}
                </div>
              </div>
              {/* What a tool asks for before it runs. No control opens these. */}
              <ToolDialogs />
            </BadgeRowProvider>
            {/* While a spoken conversation is live the mic reads the reply, so
                the automatic-playback stream stands down — one voice at a time. */}
            {TextToSpeech && automaticPlayback && <StreamAudio index={index} />}
          </ComposerShell>
        </div>
      </div>
    </form>
  );
});

export default ChatForm;
