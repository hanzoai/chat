import { useRef } from 'react';
import { Trans } from 'react-i18next';
import { BookCopy } from 'lucide-react';
import { Popover } from '@hanzo/ui/primitives/Popover';
import { PopoverContent } from '@hanzo/ui/primitives/PopoverContent';
import { PopoverTrigger } from '@hanzo/ui/primitives/PopoverTrigger';
import {
  Button,
  OGDialog,
  TooltipAnchor,
  OGDialogTitle,
  OGDialogHeader,
  OGDialogContent,
} from '@hanzochat/client';
import type { FC } from 'react';
import { EditPresetDialog, PresetItems } from './Presets';
import { useLocalize, usePresets } from '~/hooks';
import { useChatContext } from '~/Providers';

const PresetsMenu: FC = () => {
  const localize = useLocalize();
  const presetsMenuTriggerRef = useRef<HTMLDivElement>(null);
  const {
    presetsQuery,
    onSetDefaultPreset,
    onFileSelected,
    onSelectPreset,
    onChangePreset,
    clearAllPresets,
    onDeletePreset,
    submitPreset,
    exportPreset,
    showDeleteDialog,
    setShowDeleteDialog,
    presetToDelete,
    confirmDeletePreset,
  } = usePresets();
  const { preset } = useChatContext();

  const handleDeleteDialogChange = (open: boolean) => {
    setShowDeleteDialog(open);
    if (!open && presetsMenuTriggerRef.current) {
      setTimeout(() => {
        presetsMenuTriggerRef.current?.focus();
      }, 0);
    }
  };

  return (
    /* `allowFlip` restates Radix's default. Radix's `avoidCollisions` is on
     * unless you turn it off; gui's flip middleware is opt-in, so without this
     * a preset list opened near the bottom of the window runs off it. */
    <Popover allowFlip>
      {/* `except-style-web`, and both halves are load-bearing. `web` because
        * the slotted child is a COMPONENT, not a host element: gui hands a
        * component child `onPress`, and only the host-element path remaps it to
        * `onClick` — without `web` the trigger takes the prop, forwards an
        * unknown `onPress` to the DOM, and silently does nothing. `except-style`
        * because gui's View styles would otherwise be merged onto the Button
        * through TooltipAnchor. */}
      <PopoverTrigger asChild="except-style-web">
        <TooltipAnchor
          ref={presetsMenuTriggerRef}
          description={localize('com_endpoint_examples')}
          render={
            <Button
              size="icon"
              variant="outline"
              tabIndex={0}
              id="presets-button"
              data-testid="presets-button"
              aria-label={localize('com_endpoint_examples')}
              className="rounded-xl bg-presentation p-2 duration-0 hover:bg-surface-active-alt"
            >
              <BookCopy className="icon-lg" aria-hidden="true" />
            </Button>
          }
        ></TooltipAnchor>
      </PopoverTrigger>
      {/* PopoverContent mounts its own portal, so the `Portal` wrapper is gone
        * — and with it the hand-written `position: fixed; translate3d(268px,
        * 50px, 0)` div it held, which was a frozen copy of Radix's own popper
        * wrapper. Left behind it would sit in normal flow at the root as an
        * empty fixed-position box while the panel portalled away.
        *
        * `side="bottom"` and `align="center"` are both gui's defaults now, so
        * neither needs restating. The three layout props do: gui bakes
        * `width: 288`, `p: '$4'` and `alignItems: 'center'` before spreading
        * caller props, and this menu is a shrink-to-fit column of full-width
        * rows that carry their own padding. `trapFocus={false}` matches Radix's
        * non-modal content, which does not trap. */}
      <PopoverContent
        trapFocus={false}
        width="auto"
        padding={0}
        alignItems="stretch"
        className="mt-2 max-h-[495px] overflow-x-hidden rounded-lg border border-border-light bg-presentation text-text-primary shadow-lg md:min-w-[400px]"
      >
        <PresetItems
          presets={presetsQuery.data}
          onSetDefaultPreset={onSetDefaultPreset}
          onSelectPreset={onSelectPreset}
          onChangePreset={onChangePreset}
          onDeletePreset={onDeletePreset}
          clearAllPresets={clearAllPresets}
          onFileSelected={onFileSelected}
        />
      </PopoverContent>
      {preset && (
        <EditPresetDialog
          submitPreset={submitPreset}
          exportPreset={exportPreset}
          triggerRef={presetsMenuTriggerRef}
        />
      )}
      {presetToDelete && (
        <OGDialog open={showDeleteDialog} onOpenChange={handleDeleteDialogChange}>
          <OGDialogContent
            title={localize('com_endpoint_preset_delete_confirm')}
            className="w-11/12 max-w-md"
            showCloseButton={false}
          >
            <OGDialogHeader>
              <OGDialogTitle>{localize('com_ui_delete_preset')}</OGDialogTitle>
            </OGDialogHeader>
            <div className="w-full truncate">
              <Trans
                i18nKey="com_ui_delete_confirm_strong"
                values={{ title: presetToDelete.title }}
                components={{ strong: <strong /> }}
              />
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button
                aria-label="cancel"
                variant="outline"
                onClick={() => handleDeleteDialogChange(false)}
              >
                {localize('com_ui_cancel')}
              </Button>
              <Button variant="destructive" onClick={confirmDeletePreset}>
                {localize('com_ui_delete')}
              </Button>
            </div>
          </OGDialogContent>
        </OGDialog>
      )}
    </Popover>
  );
};

export default PresetsMenu;
