import { memo, useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { TextareaAutosize } from '@hanzochat/client';
import { useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { Constants, isAssistantsEndpoint, isAgentsEndpoint } from '@hanzochat/data-provider';
import {
  useChatContext,
  useChatFormContext,
  useAddedChatContext,
  useAssistantsMapContext,
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
import { mainTextareaId, BadgeItem } from '~/common';
import AttachFileChat from './Files/AttachFileChat';
import FileFormChat from './Files/FileFormChat';
import {
  cn,
  removeFocusRings,
  parseAgentCommand,
  parseBuildCommand,
  openAppBuilder,
} from '~/utils';
import { COLUMN } from '~/components/chrome';
import TextareaHeader from './TextareaHeader';
import PromptsCommand from './PromptsCommand';
import AgentsCommand from './AgentsCommand';
import Mic from './Mic';
import CreateMenu from './CreateMenu';
import CollapseChat from './CollapseChat';
import StreamAudio from './StreamAudio';
import SendButton from './SendButton';
import EditBadges from './EditBadges';
import { BadgeRowProvider } from '~/Providers';
import BadgeRow from './BadgeRow';
import Mention from './Mention';
import ComposerShell from './ComposerShell';
import store from '~/store';

const ChatForm = memo(({ index = 0 }: { index?: number }) => {
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useFocusChatEffect(textAreaRef);
  const localize = useLocalize();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [, setIsScrollable] = useState(false);
  const [visualRowCount, setVisualRowCount] = useState(1);
  const [backupBadges, setBackupBadges] = useState<Pick<BadgeItem, 'id'>[]>([]);
  // While dictation is live the recorder takes the whole action row, so the
  // attach/create/badge cluster and its spacer step aside — the waveform reads
  // full width instead of a thumbnail wedged against the send button.
  const [recording, setRecording] = useState(false);
  /** True from the moment the mic opens until it closes. */

  const TextToSpeech = useAtomValue(store.textToSpeech);
  const chatDirection = useAtomValue(store.chatDirection);
  const automaticPlayback = useAtomValue(store.automaticPlayback);
  const maximizeChatSpace = useAtomValue(store.maximizeChatSpace);
  const isTemporary = useAtomValue(store.isTemporary);

  const [badges, setBadges] = useAtom(store.chatBadges);
  const [isEditingBadges, setIsEditingBadges] = useAtom(store.isEditingBadges);
  const [showPlusPopover, setShowPlusPopover] = useAtom(store.showPlusPopoverFamily(index));
  const [showMentionPopover, setShowMentionPopover] = useAtom(
    store.showMentionPopoverFamily(index),
  );
  const setShowAgentsPopover = useSetAtom(store.showAgentsPopoverFamily(index));

  const { requiresKey } = useRequiresKey();
  const methods = useChatFormContext();
  const { files, setFiles, conversation, isSubmitting, filesLoading, newConversation } =
    useChatContext();
  const {
    generateConversation,
    conversation: addedConvo,
    setConversation: setAddedConvo,
  } = useAddedChatContext();
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

  const handleFocusOrClick = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  }, [isCollapsed]);

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
   * commands — `/build`, `/agent <name> [prompt]`, `/background` — and turns
   * each into its one action; everything else is a normal chat message. This is
   * the ONE place each of those commands is read.
   */
  const onSubmit = useCallback(
    (data?: { text: string }) => {
      const text = data?.text ?? '';
      /** `/build [prompt]` hands off to the hanzo.app builder (new tab). */
      const buildPrompt = parseBuildCommand(text);
      if (buildPrompt !== null) {
        methods.reset();
        openAppBuilder(buildPrompt);
        return;
      }
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

  const textValue = useWatch({ control: methods.control, name: 'text' });

  useEffect(() => {
    if (textAreaRef.current) {
      const style = window.getComputedStyle(textAreaRef.current);
      const lineHeight = parseFloat(style.lineHeight);
      setVisualRowCount(Math.floor(textAreaRef.current.scrollHeight / lineHeight));
    }
  }, [textValue]);

  useEffect(() => {
    if (isEditingBadges && backupBadges.length === 0) {
      setBackupBadges([...badges]);
    }
  }, [isEditingBadges, badges, backupBadges.length]);

  const handleSaveBadges = useCallback(() => {
    setIsEditingBadges(false);
    setBackupBadges([]);
  }, [setIsEditingBadges, setBackupBadges]);

  const handleCancelBadges = useCallback(() => {
    if (backupBadges.length > 0) {
      setBadges([...backupBadges]);
    }
    setIsEditingBadges(false);
    setBackupBadges([]);
  }, [backupBadges, setBadges, setIsEditingBadges]);

  const isMoreThanThreeRows = visualRowCount > 3;

  const baseClasses = useMemo(
    () =>
      cn(
        'md:py-3.5 m-0 w-full resize-none py-[13px] placeholder-black/50 bg-transparent dark:placeholder-white/50 [&:has(textarea:focus)]:shadow-[0_2px_6px_rgba(0,0,0,.05)]',
        isCollapsed ? 'max-h-[52px]' : 'max-h-[45vh] md:max-h-[55vh]',
        isMoreThanThreeRows ? 'pl-5' : 'px-5',
      ),
    [isCollapsed, isMoreThanThreeRows],
  );

  return (
    <form
      onSubmit={methods.handleSubmit(onSubmit)}
      className={cn(
        'mx-auto flex w-full flex-row gap-3 transition-[max-width] duration-300 sm:mb-10 sm:px-2',
        COLUMN(maximizeChatSpace),
      )}
    >
      <div className="relative flex h-full flex-1 items-stretch md:flex-col">
        <div className={cn('flex w-full items-center', isRTL && 'flex-row-reverse')}>
          {showPlusPopover && !isAssistantsEndpoint(endpoint) && (
            <Mention
              conversation={conversation}
              setShowMentionPopover={setShowPlusPopover}
              newConversation={generateConversation}
              textAreaRef={textAreaRef}
              commandChar="+"
              placeholder="com_ui_add_model_preset"
              includeAssistants={false}
            />
          )}
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
            docked
            className="flex-grow pb-4 sm:pb-0"
          >
            <TextareaHeader addedConvo={addedConvo} setAddedConvo={setAddedConvo} />
            {/* WIP */}
            <EditBadges
              isEditingChatBadges={isEditingBadges}
              handleCancelBadges={handleCancelBadges}
              handleSaveBadges={handleSaveBadges}
              setBadges={setBadges}
            />
            <FileFormChat conversation={conversation} />
            {endpoint && (
              <div className={cn('flex', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                <div
                  className="relative flex-1"
                  style={
                    isCollapsed
                      ? {
                          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 90%)',
                          maskImage: 'linear-gradient(to bottom, black 60%, transparent 90%)',
                        }
                      : undefined
                  }
                >
                  <TextareaAutosize
                    {...registerProps}
                    ref={(e) => {
                      ref(e);
                      (textAreaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current =
                        e;
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
                    onFocus={handleFocusOrClick}
                    aria-label={localize('com_ui_message_input')}
                    onClick={handleFocusOrClick}
                    style={{ height: isLanding ? 56 : 44, overflowY: 'auto' }}
                    className={cn(
                      baseClasses,
                      removeFocusRings,
                      'scrollbar-hover transition-[max-height] duration-200 disabled:cursor-not-allowed',
                      isLanding && 'text-base md:text-lg',
                    )}
                  />
                </div>
                <div className="flex flex-col items-start justify-start pr-2.5 pt-1.5">
                  <CollapseChat
                    isCollapsed={isCollapsed}
                    isScrollable={isMoreThanThreeRows}
                    setIsCollapsed={setIsCollapsed}
                  />
                </div>
              </div>
            )}
            <div
              className={cn(
                'composer-actions flex gap-2 pb-2',
                isRTL ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              {/* Hidden while dictating so the waveform owns the full row. */}
              {!recording && (
                <BadgeRowProvider
                  conversationId={conversationId}
                  specName={conversation?.spec}
                  isSubmitting={isSubmitting}
                >
                  {/* The provider wraps the WHOLE control row, not just the
                      badges. It used to live inside BadgeRow, which made the
                      tools state reachable only from BadgeRow's own subtree —
                      so the "+" could not offer them without throwing. Its three
                      props are ones this form already holds and already passes
                      down. */}
                  <div className={`${isRTL ? 'mr-2' : 'ml-2'}`}>
                    <AttachFileChat conversation={conversation} disableInputs={disableInputs} />
                  </div>
                  <CreateMenu />
                  <BadgeRow
                    showEphemeralBadges={
                      !!endpoint && !isAgentsEndpoint(endpoint) && !isAssistantsEndpoint(endpoint)
                    }
                    isSubmitting={isSubmitting}
                    conversationId={conversationId}
                    specName={conversation?.spec}
                    onChange={setBadges}
                    isInChat={
                      Array.isArray(conversation?.messages) && conversation.messages.length >= 1
                    }
                  />
                  <div className="mx-auto flex" />
                </BadgeRowProvider>
              )}
              {/* The mic is a core composer control — always present. It
                  self-disables and names the reason when dictation is
                  unavailable (Brave ships speech off). Gating its existence
                  behind the STT setting silently stripped it from anyone whose
                  stored value was off, and left no affordance to discover
                  dictation; the Speech settings still tune it. */}
              <Mic
                disabled={disableInputs || isNotAppendable}
                onRecordingChange={setRecording}
              />
              <div className={`${isRTL ? 'ml-2' : 'mr-2'}`}>
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
