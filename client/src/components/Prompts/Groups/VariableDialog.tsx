import React, { useMemo } from 'react';
import type { TPromptGroup } from '@hanzochat/data-provider';
import { OGDialog, OGDialogTitle, OGDialogContent } from '@hanzochat/client';
import type { OGDialogProps } from '@hanzochat/client';
import { detectVariables } from '~/utils';
import VariableForm from './VariableForm';

/** Props follow the dialog this actually renders (`OGDialog`), not the primitive behind it. */
interface VariableDialogProps extends Omit<OGDialogProps, 'onOpenChange'> {
  onClose: () => void;
  group: TPromptGroup | null;
}

const VariableDialog: React.FC<VariableDialogProps> = ({ open, onClose, group }) => {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const hasVariables = useMemo(
    () => detectVariables(group?.productionPrompt?.prompt ?? ''),
    [group?.productionPrompt?.prompt],
  );
  if (!group) {
    return null;
  }

  if (!hasVariables) {
    return null;
  }

  return (
    <OGDialog open={open} onOpenChange={handleOpenChange}>
      <OGDialogContent className="max-h-[90vh] max-w-full overflow-y-auto bg-white dark:border-gray-700 dark:bg-gray-850 dark:text-gray-300 md:max-w-[60vw]">
        <OGDialogTitle>{group.name}</OGDialogTitle>
        <VariableForm group={group} onClose={onClose} />
      </OGDialogContent>
    </OGDialog>
  );
};

export default VariableDialog;
