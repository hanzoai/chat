import { useState, useId, useRef } from 'react';
import { useAtomValue } from 'jotai';
import * as Ariakit from '@ariakit/react';
import { Upload, Share2 } from 'lucide-react';
import { DropdownPopup, TooltipAnchor, useIsSmallScreen } from '@hanzochat/client';
import type * as t from '~/common';
import ExportModal from '~/components/Nav/ExportConversation/ExportModal';
import { ShareButton } from '~/components/Conversations/ConvoOptions';
import { CONTROL, CONTROL_OPEN } from '~/components/chrome';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

export default function ExportAndShareMenu({
  isSharedButtonEnabled,
}: {
  isSharedButtonEnabled: boolean;
}) {
  const localize = useLocalize();
  const [showExports, setShowExports] = useState(false);
  const [isPopoverActive, setIsPopoverActive] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const menuId = useId();
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const isSmallScreen = useIsSmallScreen();
  const conversation = useAtomValue(store.conversationByIndex(0));

  const exportable =
    conversation &&
    conversation.conversationId != null &&
    conversation.conversationId !== 'new' &&
    conversation.conversationId !== 'search';

  if (exportable === false) {
    return null;
  }

  const shareHandler = () => {
    setShowShareDialog(true);
  };

  const exportHandler = () => {
    setShowExports(true);
  };

  const dropdownItems: t.MenuItemProps[] = [
    {
      label: localize('com_ui_share'),
      onClick: shareHandler,
      icon: <Share2 className="icon-md mr-2 text-text-secondary" />,
      show: isSharedButtonEnabled,
      /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
      hideOnClick: false,
      ref: shareButtonRef,
      render: (props) => <button {...props} />,
    },
    {
      label: localize('com_endpoint_export'),
      onClick: exportHandler,
      icon: <Upload className="icon-md mr-2 text-text-secondary" />,
      /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
      hideOnClick: false,
      ref: exportButtonRef,
      render: (props) => <button {...props} />,
    },
  ];

  return (
    <>
      <DropdownPopup
        portal={true}
        menuId={menuId}
        focusLoop={true}
        unmountOnHide={true}
        isOpen={isPopoverActive}
        setIsOpen={setIsPopoverActive}
        trigger={
          <TooltipAnchor
            description={localize('com_endpoint_export_share')}
            render={
              <Ariakit.MenuButton
                id="export-menu-button"
                aria-label="Export options"
                className={cn(
                  CONTROL,
                  'disabled:pointer-events-none disabled:opacity-50',
                  isPopoverActive && CONTROL_OPEN,
                )}
              >
                <Share2 className="text-text-primary" aria-hidden="true" focusable="false" />
              </Ariakit.MenuButton>
            }
          />
        }
        items={dropdownItems}
        className={isSmallScreen ? '' : 'absolute right-0 top-0 mt-2'}
      />
      <ExportModal
        open={showExports}
        onOpenChange={setShowExports}
        conversation={conversation}
        triggerRef={exportButtonRef}
        aria-label={localize('com_ui_export_convo_modal')}
      />
      <ShareButton
        triggerRef={shareButtonRef}
        conversationId={conversation.conversationId ?? ''}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />
    </>
  );
}
