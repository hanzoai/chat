import React, { useState, useMemo, memo } from 'react';
import { useAtom } from 'jotai';
import * as Ariakit from '@ariakit/react';
import { Ellipsis } from 'lucide-react';
import type { TConversation, TMessage, TFeedback } from '@hanzochat/data-provider';
import {
  EditIcon,
  Clipboard,
  CheckMark,
  ContinueIcon,
  RegenerateIcon,
  useMediaQuery,
} from '@hanzochat/client';
import { useGenerationsByLatest, useLocalize } from '~/hooks';
import { Fork } from '~/components/Conversations';
import MessageAudio from './MessageAudio';
import Feedback from './Feedback';
import { cn } from '~/utils';
import store from '~/store';

type THoverButtons = {
  isEditing: boolean;
  enterEdit: (cancel?: boolean) => void;
  copyToClipboard: (setIsCopied: React.Dispatch<React.SetStateAction<boolean>>) => void;
  conversation: TConversation | null;
  isSubmitting: boolean;
  message: TMessage;
  regenerate: () => void;
  handleContinue: (e: React.MouseEvent<HTMLButtonElement>) => void;
  latestMessage: TMessage | null;
  isLast: boolean;
  index: number;
  handleFeedback?: ({ feedback }: { feedback: TFeedback | undefined }) => void;
};

type HoverButtonProps = {
  id?: string;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  /** The name of the action, printed beside the glyph. Set only where the
   *  control is folded into the ⋯ popover — a phone shows no tooltip, so a
   *  glyph on its own there is a guess. */
  label?: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isVisible?: boolean;
  isDisabled?: boolean;
  isLast?: boolean;
  className?: string;
  buttonStyle?: string;
};

/**
 * The box every control under a message wears: transparent at rest, a ground
 * only under the pointer or while its own popover is open.
 *
 * A value rather than a literal inside `HoverButton` because the ⋯ trigger is
 * the same control and must not spell it a second time.
 */
const ghost = ({
  isActive = false,
  isVisible = true,
  isLast = false,
  className = '',
}: Pick<HoverButtonProps, 'isActive' | 'isVisible' | 'isLast' | 'className'>) =>
  cn(
    'hover-button rounded-lg p-1.5 text-text-secondary-alt',
    'hover:text-text-primary hover:bg-surface-hover',
    'md:group-hover:visible md:group-focus-within:visible md:group-[.final-completion]:visible',
    !isLast && 'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
    !isVisible && 'opacity-0',
    'focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:outline-none',
    isActive && isVisible && 'active text-text-primary bg-surface-hover',
    className,
  );

/**
 * What a folded control wears instead: a full-width labelled row, 44 tall,
 * which is the same row every other menu in the app draws.
 *
 * `!flex` because `mobile.css` gives `.hover-button` — and `.hover-button.active`
 * at (0,2,0) — `display: block` below 1024px, and it loads after the utilities,
 * so a plain `flex` loses. Every control here carries that class.
 */
const FOLDED = '!flex min-h-11 w-full items-center gap-2 px-3 text-sm text-text-primary';

const extractMessageContent = (message: TMessage): string => {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (part == null) {
          return '';
        }
        if (typeof part === 'string') {
          return part;
        }
        if ('text' in part) {
          return part.text || '';
        }
        if ('think' in part) {
          const think = part.think;
          if (typeof think === 'string') {
            return think;
          }
          return think && 'text' in think ? think.text || '' : '';
        }
        return '';
      })
      .join('');
  }

  return message.text || '';
};

const HoverButton = memo(
  ({
    id,
    onClick,
    title,
    label,
    icon,
    isActive = false,
    isVisible = true,
    isDisabled = false,
    isLast = false,
    className = '',
  }: HoverButtonProps) => (
    <button
      id={id}
      className={ghost({ isActive, isVisible, isLast, className })}
      onClick={onClick}
      type="button"
      title={title}
      disabled={isDisabled}
    >
      {icon}
      {label != null && <span className="truncate">{label}</span>}
    </button>
  ),
);

HoverButton.displayName = 'HoverButton';

/**
 * Where the row's secondary half goes on a phone.
 *
 * Seven glyphs under every reply is the whole row shouting at the same volume;
 * at 390px it is also most of a line. So the four a reader reaches for — copy,
 * the two thumbs, regenerate — stay in the row, and the rest fold in here,
 * named. Nothing is dropped: the controls are the same elements either way, so
 * the audio keeps its `<audio>` and Fork keeps its own options popover.
 *
 * A popover rather than `DropdownPopup` because the folded controls are
 * components, not menu data — the same reason Feedback and Fork, the two
 * controls beside it, each wear `popover-animate` too. Glass, so it reads as
 * the same material as the rest of the chrome and not a slab over the thread.
 */
const More = ({
  isLast,
  fork,
  children,
}: {
  isLast: boolean;
  fork: React.ReactNode;
  children: React.ReactNode;
}) => {
  const localize = useLocalize();
  const popover = Ariakit.usePopoverStore({ placement: 'bottom-end' });
  const open = Ariakit.useStoreState(popover, 'open');
  const title = localize('com_ui_more_options');

  return (
    <>
      <Ariakit.PopoverDisclosure
        store={popover}
        title={title}
        aria-label={title}
        className={ghost({
          isActive: open,
          isLast,
          className: '!inline-flex size-11 items-center justify-center',
        })}
      >
        <Ellipsis size="19" aria-hidden="true" />
      </Ariakit.PopoverDisclosure>
      <Ariakit.Popover
        store={popover}
        gutter={8}
        portal
        aria-label={title}
        className="popover-animate glass elevation-2 z-40 flex w-56 flex-col gap-0.5 rounded-2xl border border-border-medium p-1.5 shadow-lg"
      >
        {/* An action that fires is finished, so the sheet gets out of its way.
            Fork is not finished — it opens its options from that same trigger,
            which has to stay on screen for them to hang off — so it sits
            outside the closer. */}
        <div className="contents" onClick={() => popover.hide()}>
          {children}
        </div>
        {fork}
      </Ariakit.Popover>
    </>
  );
};

const HoverButtons = ({
  index,
  isEditing,
  enterEdit,
  copyToClipboard,
  conversation,
  isSubmitting,
  message,
  regenerate,
  handleContinue,
  latestMessage,
  isLast,
  handleFeedback,
}: THoverButtons) => {
  const localize = useLocalize();
  const [isCopied, setIsCopied] = useState(false);
  const [TextToSpeech] = useAtom<boolean>(store.textToSpeech);
  /** Tailwind's `sm` is `min-width: 640px`, so its complement is 639.98 and not
   *  639 or 640 — the first leaves a sliver where neither half matches, the
   *  second a pixel where both do, and either way the row and the styles it
   *  wears would disagree about which one is showing. */
  const folded = useMediaQuery('(max-width: 639.98px)');

  const endpoint = useMemo(() => {
    if (!conversation) {
      return '';
    }
    return conversation.endpointType ?? conversation.endpoint;
  }, [conversation]);

  const generationCapabilities = useGenerationsByLatest({
    isEditing,
    isSubmitting,
    error: message.error,
    endpoint: endpoint ?? '',
    messageId: message.messageId,
    searchResult: message.searchResult,
    finish_reason: message.finish_reason,
    isCreatedByUser: message.isCreatedByUser,
    latestMessageId: latestMessage?.messageId,
  });

  const {
    hideEditButton,
    regenerateEnabled,
    continueSupported,
    forkingSupported,
    isEditableEndpoint,
  } = generationCapabilities;

  if (!conversation) {
    return null;
  }

  const { isCreatedByUser, error } = message;

  if (error === true) {
    return (
      <div className="visible flex justify-center self-end lg:justify-start">
        {regenerateEnabled && (
          <HoverButton
            onClick={regenerate}
            title={localize('com_ui_regenerate')}
            icon={<RegenerateIcon size="19" />}
            isLast={isLast}
          />
        )}
      </div>
    );
  }

  const onEdit = () => {
    if (isEditing) {
      return enterEdit(true);
    }
    enterEdit();
  };

  const handleCopy = () => copyToClipboard(setIsCopied);

  /** The box a control wears once it is folded; nothing while it is still in
   *  the row. Its name travels with it, and only there. */
  const box = folded ? FOLDED : undefined;

  /* Read aloud, edit, fork and continue — one definition each, rendered either
     in the row or in the ⋯ popover, never both. */
  const speak = TextToSpeech && (
    <MessageAudio
      index={index}
      isLast={isLast}
      messageId={message.messageId}
      content={extractMessageContent(message)}
      renderButton={(props) => (
        <HoverButton
          onClick={props.onClick}
          title={props.title}
          label={folded ? props.title : undefined}
          icon={props.icon}
          isActive={props.isActive}
          isLast={isLast}
          className={box}
        />
      )}
    />
  );

  /* In the row an unusable edit still holds its place, invisible, as it always
     has; a popover has no place to hold, so it is simply absent there. */
  const edit = isEditableEndpoint && (!folded || !hideEditButton) && (
    <HoverButton
      id={`edit-${message.messageId}`}
      onClick={onEdit}
      title={localize('com_ui_edit')}
      label={folded ? localize('com_ui_edit') : undefined}
      icon={<EditIcon size="19" />}
      isActive={isEditing}
      isVisible={!hideEditButton}
      isDisabled={hideEditButton}
      isLast={isLast}
      className={cn(isCreatedByUser ? '' : 'active', box)}
    />
  );

  const fork = (
    <Fork
      messageId={message.messageId}
      conversationId={conversation.conversationId}
      forkingSupported={forkingSupported}
      latestMessageId={latestMessage?.messageId}
      isLast={isLast}
      label={folded ? localize('com_ui_fork') : undefined}
      className={box}
    />
  );

  const continues = continueSupported === true && (
    <HoverButton
      onClick={(e) => e && handleContinue(e)}
      title={localize('com_ui_continue')}
      label={folded ? localize('com_ui_continue') : undefined}
      icon={<ContinueIcon className="w-19 h-19 -rotate-180" />}
      isLast={isLast}
      className={cn('active', box)}
    />
  );

  /** No ⋯ when there is nothing behind it. `fork` is always an element — it
   *  decides for itself whether it draws — so it is asked as a condition. */
  const hasSecondary = Boolean(
    speak || edit || continues || (forkingSupported && conversation.conversationId),
  );

  return (
    <div className="group visible flex justify-center gap-0.5 self-end focus-within:outline-none lg:justify-start">
      {!folded && speak}

      {/* Copy Button */}
      <HoverButton
        onClick={handleCopy}
        title={
          isCopied ? localize('com_ui_copied_to_clipboard') : localize('com_ui_copy_to_clipboard')
        }
        icon={isCopied ? <CheckMark className="h-[18px] w-[18px]" /> : <Clipboard size="19" />}
        isLast={isLast}
        className={cn(
          'ml-0 flex items-center gap-1.5 text-xs',
          isSubmitting && isCreatedByUser ? 'md:opacity-0 md:group-hover:opacity-100' : '',
        )}
      />

      {!folded && edit}
      {!folded && fork}

      {/* Feedback Buttons */}
      {!isCreatedByUser && handleFeedback != null && (
        <Feedback handleFeedback={handleFeedback} feedback={message.feedback} isLast={isLast} />
      )}

      {/* Regenerate Button */}
      {regenerateEnabled && (
        <HoverButton
          onClick={regenerate}
          title={localize('com_ui_regenerate')}
          icon={<RegenerateIcon size="19" />}
          isLast={isLast}
          className="active"
        />
      )}

      {!folded && continues}

      {folded && hasSecondary && (
        <More isLast={isLast} fork={fork}>
          {speak}
          {edit}
          {continues}
        </More>
      )}
    </div>
  );
};

export default memo(HoverButtons);
