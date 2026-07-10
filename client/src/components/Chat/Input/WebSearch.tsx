import React, { memo } from 'react';
import { Globe } from 'lucide-react';
import { CheckboxButton } from '@librechat/client';
import { Permissions, PermissionTypes } from 'librechat-data-provider';
import { useLocalize, useHasAccess } from '~/hooks';
import { useBadgeRowContext } from '~/Providers';

function WebSearch() {
  const localize = useLocalize();
  const { webSearch: webSearchData, searchApiKeyForm } = useBadgeRowContext();
  const { toggleState: webSearch, debouncedChange, isPinned, authData } = webSearchData;
  const { badgeTriggerRef } = searchApiKeyForm;

  const canUseWebSearch = useHasAccess({
    permissionType: PermissionTypes.WEB_SEARCH,
    permission: Permissions.USE,
  });

  if (!canUseWebSearch) {
    return null;
  }

  return (
    (isPinned || (webSearch && authData?.authenticated)) && (
      <CheckboxButton
        ref={badgeTriggerRef}
        className="max-w-fit"
        checked={webSearch}
        setValue={debouncedChange}
        label={localize('com_ui_search')}
        isCheckedClassName="border-border-heavy bg-surface-active-alt hover:bg-surface-active-alt"
        icon={<Globe className="icon-md" aria-hidden="true" />}
      />
    )
  );
}

export default memo(WebSearch);
