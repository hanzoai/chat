import { useCallback, useId, useRef, useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { Archive, Ellipsis, Pen, Trash, Upload } from 'lucide-react';
import {
  DropdownPopup,
  Input,
  OGDialog,
  OGDialogTemplate,
  Spinner,
  TooltipAnchor,
  useToastContext,
} from '@hanzochat/client';
import type * as t from '~/common';
import DeleteButton from '~/components/Conversations/ConvoOptions/DeleteButton';
import ExportModal from '~/components/Nav/ExportConversation/ExportModal';
import { CONTROL, CONTROL_OPEN } from '~/components/chrome';
import { useArchiveConvoMutation } from '~/data-provider';
import { useConvoRename, useLocalize } from '~/hooks';
import { NotificationSeverity } from '~/common';
import { useChatContext } from '~/Providers';
import { cn } from '~/utils';

/**
 * Everything you can do to the conversation you are reading.
 *
 * Four verbs, one glyph. They were scattered before: export sat behind a share
 * icon in the header, and rename, archive and delete existed only on the
 * conversation's row in the sidebar — so acting on the thread in front of you
 * meant finding it in a list first.
 *
 * The sidebar row keeps its own menu, and that is not a second answer: a row
 * acts on a conversation you are NOT in, and carries pinning and bookmarking,
 * which are about the list. This one acts on the open thread and carries
 * exporting, which only means anything when there is something on screen to
 * export.
 *
 * Rename is a dialog here rather than the row's inline field. There is no title
 * in the header to type over — the header names the model, not the
 * conversation — so the field has to arrive with somewhere to live. The WRITE is
 * still `useConvoRename`, the same one both other surfaces use, so trimming, the
 * Untitled fallback and the failure toast are stated once.
 *
 * Every row that opens a dialog sets `hideOnClick: false` and hands the menu its
 * own `ref`: the dialog is mounted under this menu, so letting the click close
 * the menu unmounts the thing that was about to open and returns focus nowhere.
 */
export default function ConvoMenu() {
  const localize = useLocalize();
  const menuId = useId();
  const { showToast } = useToastContext();
  const { conversation } = useChatContext();
  const conversationId = conversation?.conversationId ?? '';
  const title = conversation?.title ?? '';

  const [open, setOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const renameRef = useRef<HTMLButtonElement>(null);
  const exportRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  const archive = useArchiveConvoMutation();
  const { titleInput, setTitleInput, startRename, submitRename } = useConvoRename(
    conversationId,
    title,
  );

  const rename = useCallback(() => {
    startRename();
    setRenameOpen(true);
  }, [startRename]);

  const save = useCallback(async () => {
    await submitRename(titleInput);
    setRenameOpen(false);
    setOpen(false);
  }, [submitRename, titleInput]);

  const stow = useCallback(() => {
    archive.mutate(
      { conversationId, isArchived: true },
      {
        onSuccess: () => setOpen(false),
        onError: () =>
          showToast({
            message: localize('com_ui_archive_error'),
            severity: NotificationSeverity.ERROR,
            showIcon: true,
          }),
      },
    );
  }, [archive, conversationId, localize, showToast]);

  /* A conversation nobody has sent a message to has no title to change, no
     history to export and nothing on the server to archive or delete. */
  if (conversationId === '' || conversationId === 'new' || conversationId === 'search') {
    return null;
  }

  const items: t.MenuItemProps[] = [
    {
      label: localize('com_ui_rename'),
      onClick: rename,
      icon: <Pen aria-hidden={true} />,
      hideOnClick: false,
      ref: renameRef,
      render: (props) => <button {...props} />,
    },
    {
      label: localize('com_ui_archive'),
      onClick: stow,
      hideOnClick: false,
      icon: archive.isLoading ? <Spinner className="size-4" /> : <Archive aria-hidden={true} />,
    },
    {
      label: localize('com_endpoint_export'),
      onClick: () => setExportOpen(true),
      icon: <Upload aria-hidden={true} />,
      hideOnClick: false,
      ref: exportRef,
      render: (props) => <button {...props} />,
    },
    { separate: true },
    {
      label: localize('com_ui_delete'),
      onClick: () => setDeleteOpen(true),
      className: 'text-text-destructive',
      icon: <Trash className="text-text-destructive" aria-hidden={true} />,
      hideOnClick: false,
      ref: deleteRef,
      /* `aria-haspopup` rides the element, not the item. `MenuItemProps` has no
         field for it — the one other menu that passes one gets away with it
         because its array is built inside a `useMemo`, so the literal is no
         longer fresh by the time it is assigned and the excess-property check
         never runs. Writing it here is the same DOM without the loophole. */
      render: (props) => <button {...props} aria-haspopup="dialog" />,
    },
  ];

  return (
    <>
      <DropdownPopup
        portal={true}
        menuId={menuId}
        focusLoop={true}
        unmountOnHide={true}
        isOpen={open}
        setIsOpen={setOpen}
        trigger={
          <TooltipAnchor
            description={localize('com_ui_more_options')}
            render={
              <Ariakit.MenuButton
                id="convo-menu-button"
                aria-label={localize('com_ui_more_options')}
                className={cn(CONTROL, open && CONTROL_OPEN)}
              >
                <Ellipsis aria-hidden={true} />
              </Ariakit.MenuButton>
            }
          />
        }
        items={items}
      />
      <OGDialog open={renameOpen} onOpenChange={setRenameOpen} triggerRef={renameRef}>
        <OGDialogTemplate
          title={localize('com_ui_rename_conversation')}
          className="w-11/12 max-w-md"
          main={
            <Input
              value={titleInput}
              maxLength={100}
              autoFocus={true}
              aria-label={localize('com_ui_new_conversation_title')}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void save();
                }
              }}
            />
          }
          selection={{ selectHandler: () => void save(), selectText: localize('com_ui_save') }}
        />
      </OGDialog>
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        conversation={conversation}
        triggerRef={exportRef}
      />
      <DeleteButton
        title={title}
        conversationId={conversationId}
        triggerRef={deleteRef}
        setMenuOpen={setOpen}
        showDeleteDialog={deleteOpen}
        setShowDeleteDialog={setDeleteOpen}
        /* The sidebar passes the list's scroll-keeper here. The header has no
           list to keep; deleting from it navigates away. */
        retainView={() => undefined}
      />
    </>
  );
}
