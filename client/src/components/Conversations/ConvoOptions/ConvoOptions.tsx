import { useState, useId, useRef, memo, useCallback, useMemo } from 'react';
import * as Ariakit from '@ariakit/react';
import { useParams, useNavigate } from 'react-router-dom';
import { QueryKeys, PermissionTypes, Permissions } from '@hanzochat/data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { DropdownPopup, Spinner, useToastContext } from '@hanzochat/client';
import {
  Ellipsis,
  Share2,
  CopyPlus,
  Archive,
  Pen,
  Trash,
  Pin,
  PinOff,
  Bookmark,
  BookmarkPlusIcon,
} from 'lucide-react';
import type { MouseEvent } from 'react';
import type * as t from '~/common';
import type { TMessage, TConversationTag } from '@hanzochat/data-provider';
import {
  useDuplicateConversationMutation,
  useDeleteConversationMutation,
  useConversationTagsQuery,
  useTagConversationMutation,
  useGetStartupConfig,
  useArchiveConvoMutation,
} from '~/data-provider';
import {
  useLocalize,
  useNavigateToConvo,
  useNewConvo,
  useHasAccess,
  useConvoPin,
  useBookmarkSuccess,
} from '~/hooks';
import { BookmarkEditDialog } from '~/components/Bookmarks';
import { NotificationSeverity } from '~/common';
import { useChatContext } from '~/Providers';
import DeleteButton from './DeleteButton';
import ShareButton from './ShareButton';
import { cn } from '~/utils';

function ConvoOptions({
  conversationId,
  title,
  tags,
  isPinned = false,
  retainView,
  renameHandler,
  isPopoverActive,
  setIsPopoverActive,
  isActiveConvo,
  isShiftHeld = false,
  getAnchorRect,
}: {
  conversationId: string | null;
  title: string | null;
  tags?: string[];
  isPinned?: boolean;
  retainView: () => void;
  renameHandler: (e: MouseEvent) => void;
  isPopoverActive: boolean;
  setIsPopoverActive: (open: boolean) => void;
  isActiveConvo: boolean;
  isShiftHeld?: boolean;
  /** Set by a right-click to anchor this same menu at the pointer. */
  getAnchorRect?: () => { x: number; y: number } | null;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { index } = useChatContext();
  const { data: startupConfig } = useGetStartupConfig();
  const { navigateToConvo } = useNavigateToConvo(index);
  const { showToast } = useToastContext();

  const navigate = useNavigate();
  const { conversationId: currentConvoId } = useParams();
  const { newConversation } = useNewConvo();

  const menuId = useId();
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const newBookmarkRef = useRef<HTMLButtonElement>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const archiveConvoMutation = useArchiveConvoMutation();
  const { setPinned, isPinning } = useConvoPin();

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });
  const { data: allBookmarks } = useConversationTagsQuery();
  const updateConvoTags = useBookmarkSuccess(conversationId ?? '');
  const tagMutation = useTagConversationMutation(conversationId ?? '', {
    onSuccess: (newTags: string[]) => updateConvoTags(newTags),
    onError: () =>
      showToast({
        message: localize('com_ui_bookmarks_update_error'),
        severity: NotificationSeverity.ERROR,
      }),
  });

  const deleteMutation = useDeleteConversationMutation({
    onSuccess: () => {
      if (currentConvoId === conversationId || currentConvoId === 'new') {
        newConversation();
        navigate('/', { replace: true });
      }
      retainView();
      showToast({
        message: localize('com_ui_convo_delete_success'),
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_convo_delete_error'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const duplicateConversation = useDuplicateConversationMutation({
    onSuccess: (data) => {
      navigateToConvo(data.conversation);
      showToast({
        message: localize('com_ui_duplication_success'),
        status: 'success',
      });
      setIsPopoverActive(false);
    },
    onMutate: () => {
      showToast({
        message: localize('com_ui_duplication_processing'),
        status: 'info',
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_duplication_error'),
        status: 'error',
      });
    },
  });

  const isDuplicateLoading = duplicateConversation.isLoading;
  const isArchiveLoading = archiveConvoMutation.isLoading;
  const isDeleteLoading = deleteMutation.isLoading;

  const shareHandler = useCallback(() => {
    setShowShareDialog(true);
  }, []);

  const deleteHandler = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleInstantDelete = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      const convoId = conversationId ?? '';
      if (!convoId) {
        return;
      }
      const messages = queryClient.getQueryData<TMessage[]>([QueryKeys.messages, convoId]);
      const thread_id = messages?.[messages.length - 1]?.thread_id;
      const endpoint = messages?.[messages.length - 1]?.endpoint;
      deleteMutation.mutate({ conversationId: convoId, thread_id, endpoint, source: 'button' });
    },
    [conversationId, deleteMutation, queryClient],
  );

  const handleArchiveClick = useCallback(
    async (e?: MouseEvent) => {
      e?.stopPropagation();
      const convoId = conversationId ?? '';
      if (!convoId) {
        return;
      }

      archiveConvoMutation.mutate(
        { conversationId: convoId, isArchived: true },
        {
          onSuccess: () => {
            setAnnouncement(localize('com_ui_convo_archived'));
            setTimeout(() => {
              setAnnouncement('');
            }, 10000);
            if (currentConvoId === convoId || currentConvoId === 'new') {
              newConversation();
              navigate('/', { replace: true });
            }
            retainView();
            setIsPopoverActive(false);
          },
          onError: () => {
            showToast({
              message: localize('com_ui_archive_error'),
              severity: NotificationSeverity.ERROR,
              showIcon: true,
            });
          },
        },
      );
    },
    [
      conversationId,
      currentConvoId,
      archiveConvoMutation,
      navigate,
      newConversation,
      retainView,
      setIsPopoverActive,
      showToast,
      localize,
    ],
  );

  const handleDuplicateClick = useCallback(() => {
    duplicateConversation.mutate({
      conversationId: conversationId ?? '',
    });
  }, [conversationId, duplicateConversation]);

  const handlePinClick = useCallback(() => {
    setPinned(conversationId, !isPinned);
  }, [setPinned, conversationId, isPinned]);

  /** Toggles one bookmark on this conversation, dropping tags the user deleted. */
  const handleToggleBookmark = useCallback(
    (tag: string) => {
      if (!conversationId) {
        return;
      }
      const known = new Set(
        (
          queryClient.getQueryData<TConversationTag[]>([QueryKeys.conversationTags]) ??
          allBookmarks ??
          []
        ).map((b) => b.tag),
      );
      const current = (tags ?? []).filter((t) => known.has(t));
      const newTags = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
      tagMutation.mutate({ tags: newTags, tag });
    },
    [conversationId, tags, allBookmarks, queryClient, tagMutation],
  );

  /** "Add to bookmark" — bookmarks are this product's conversation grouping. */
  const bookmarkItems: t.MenuItemProps[] = useMemo(() => {
    const items: t.MenuItemProps[] = [
      {
        id: `${conversationId}-new-bookmark`,
        label: localize('com_ui_bookmarks_new'),
        icon: <BookmarkPlusIcon className="icon-sm mr-2 text-text-primary" aria-hidden={true} />,
        hideOnClick: false,
        ref: newBookmarkRef,
        render: (props) => <button {...props} />,
        onClick: () => setShowBookmarkDialog(true),
      },
    ];
    for (const bookmark of allBookmarks ?? []) {
      const isSelected = tags?.includes(bookmark.tag) === true;
      items.push({
        id: `${conversationId}-${bookmark.tag}`,
        label: bookmark.tag,
        hideOnClick: false,
        ariaChecked: isSelected,
        disabled: tagMutation.isLoading,
        icon: (
          <Bookmark
            className="icon-sm mr-2 text-text-primary"
            fill={isSelected ? 'currentColor' : 'none'}
            aria-hidden={true}
          />
        ),
        onClick: () => handleToggleBookmark(bookmark.tag),
      });
    }
    return items;
  }, [allBookmarks, tags, conversationId, localize, tagMutation.isLoading, handleToggleBookmark]);

  /**
   * ONE menu, shared by the kebab and the right-click. Ordered as the reference
   * does — pin, rename, group, then the destructive action last — with our own
   * Share / Duplicate / Archive folded into the middle block.
   *
   * There is deliberately no "Mark as unread": this product has no unread state,
   * and a menu item that toggles nothing is worse than an absent one.
   */
  const dropdownItems: t.MenuItemProps[] = useMemo(
    () => [
      {
        label: isPinned ? localize('com_ui_unpin') : localize('com_ui_pin'),
        onClick: handlePinClick,
        kbd: 'P',
        ariaChecked: isPinned,
        icon: isPinning ? (
          <Spinner className="size-4" />
        ) : isPinned ? (
          <PinOff className="icon-sm mr-2 text-text-primary" aria-hidden={true} />
        ) : (
          <Pin className="icon-sm mr-2 text-text-primary" aria-hidden={true} />
        ),
      },
      {
        label: localize('com_ui_rename'),
        onClick: renameHandler,
        kbd: 'R',
        icon: <Pen className="icon-sm mr-2 text-text-primary" aria-hidden={true} />,
      },
      {
        id: `${conversationId}-bookmarks`,
        label: localize('com_ui_add_to_bookmark'),
        icon: <Bookmark className="icon-sm mr-2 text-text-primary" aria-hidden={true} />,
        show: hasAccessToBookmarks,
        subItems: bookmarkItems,
      },
      { separate: true },
      {
        label: localize('com_ui_share'),
        onClick: shareHandler,
        icon: <Share2 className="icon-sm mr-2 text-text-primary" aria-hidden={true} />,
        show: startupConfig && startupConfig.sharedLinksEnabled,
        ariaHasPopup: 'dialog' as const,
        ariaControls: 'share-conversation-dialog',
        /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
        hideOnClick: false,
        ref: shareButtonRef,
        render: (props) => <button {...props} />,
      },
      {
        label: localize('com_ui_duplicate'),
        onClick: handleDuplicateClick,
        hideOnClick: false,
        icon: isDuplicateLoading ? (
          <Spinner className="size-4" />
        ) : (
          <CopyPlus className="icon-sm mr-2 text-text-primary" aria-hidden={true} />
        ),
      },
      {
        label: localize('com_ui_archive'),
        onClick: handleArchiveClick,
        hideOnClick: false,
        icon: isArchiveLoading ? (
          <Spinner className="size-4" />
        ) : (
          <Archive className="icon-sm mr-2 text-text-primary" aria-hidden={true} />
        ),
      },
      { separate: true },
      {
        label: localize('com_ui_delete'),
        onClick: deleteHandler,
        kbd: 'D',
        className: 'text-text-destructive',
        icon: <Trash className="icon-sm mr-2 text-text-destructive" aria-hidden={true} />,
        ariaHasPopup: 'dialog' as const,
        ariaControls: 'delete-conversation-dialog',
        /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
        hideOnClick: false,
        ref: deleteButtonRef,
        render: (props) => <button {...props} />,
      },
    ],
    [
      localize,
      isPinned,
      isPinning,
      handlePinClick,
      conversationId,
      bookmarkItems,
      hasAccessToBookmarks,
      shareHandler,
      startupConfig,
      renameHandler,
      deleteHandler,
      isArchiveLoading,
      isDuplicateLoading,
      handleArchiveClick,
      handleDuplicateClick,
    ],
  );

  const buttonClassName = cn(
    'inline-flex h-7 w-7 items-center justify-center rounded-md border-none p-0 text-sm font-medium ring-ring-primary transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
    isActiveConvo === true || isPopoverActive
      ? 'opacity-100'
      : 'opacity-0 focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[open]:opacity-100',
  );

  if (isShiftHeld && isActiveConvo && !isPopoverActive && !showShareDialog && !showDeleteDialog) {
    return (
      <div className="flex items-center gap-0.5">
        <button
          aria-label={localize('com_ui_archive')}
          className={cn(buttonClassName, 'hover:bg-surface-hover')}
          onClick={handleArchiveClick}
          disabled={isArchiveLoading}
        >
          {isArchiveLoading ? (
            <Spinner className="size-4" />
          ) : (
            <Archive className="icon-md text-text-secondary" aria-hidden={true} />
          )}
        </button>
        <button
          aria-label={localize('com_ui_delete')}
          className={cn(buttonClassName, 'hover:bg-surface-hover')}
          onClick={handleInstantDelete}
          disabled={isDeleteLoading}
        >
          {isDeleteLoading ? (
            <Spinner className="size-4" />
          ) : (
            <Trash className="icon-md text-text-secondary" aria-hidden={true} />
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      <DropdownPopup
        portal={true}
        menuId={menuId}
        focusLoop={true}
        className="z-[125]"
        unmountOnHide={true}
        isOpen={isPopoverActive}
        setIsOpen={setIsPopoverActive}
        getAnchorRect={getAnchorRect}
        trigger={
          <Ariakit.MenuButton
            id={`conversation-menu-${conversationId}`}
            aria-label={localize('com_nav_convo_menu_options')}
            aria-expanded={isPopoverActive}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center gap-2 rounded-md border-none p-0 text-sm font-medium ring-ring-primary transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
              isActiveConvo === true || isPopoverActive
                ? 'opacity-100'
                : 'opacity-0 focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[open]:opacity-100',
            )}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
          >
            <Ellipsis className="icon-md text-text-secondary" aria-hidden={true} />
          </Ariakit.MenuButton>
        }
        items={dropdownItems}
      />
      {showShareDialog && (
        <ShareButton
          conversationId={conversationId ?? ''}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          triggerRef={shareButtonRef}
        />
      )}
      {showDeleteDialog && (
        <DeleteButton
          title={title ?? ''}
          retainView={retainView}
          triggerRef={deleteButtonRef}
          setMenuOpen={setIsPopoverActive}
          showDeleteDialog={showDeleteDialog}
          conversationId={conversationId ?? ''}
          setShowDeleteDialog={setShowDeleteDialog}
        />
      )}
      {showBookmarkDialog && (
        <BookmarkEditDialog
          tags={tags}
          context="ConvoOptions"
          open={showBookmarkDialog}
          setTags={updateConvoTags}
          triggerRef={newBookmarkRef}
          setOpen={setShowBookmarkDialog}
          conversationId={conversationId ?? ''}
        />
      )}
    </>
  );
}

export default memo(ConvoOptions, (prevProps, nextProps) => {
  return (
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.title === nextProps.title &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.tags === nextProps.tags &&
    prevProps.isPopoverActive === nextProps.isPopoverActive &&
    prevProps.isActiveConvo === nextProps.isActiveConvo &&
    prevProps.isShiftHeld === nextProps.isShiftHeld &&
    prevProps.getAnchorRect === nextProps.getAnchorRect
  );
});
