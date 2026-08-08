import React, { useMemo } from 'react';
import SearchApiKeyDialog from '~/components/SidePanel/Agents/Search/ApiKeyDialog';
import { useBadgeRowContext } from '~/Providers';

/**
 * Key dialogs for the tools that still take a user-held key.
 *
 * The code interpreter no longer does, and its dialog is gone rather than hidden:
 * a sandbox runs under the caller's own Hanzo IAM bearer, so there is no key to
 * type and nowhere to put one. What used to sit beside this was a form that
 * stored `CHAT_CODE_API_KEY` as a per-user plugin credential for a shared service
 * key the user never held.
 */
function ToolDialogs() {
  const { webSearch, searchApiKeyForm } = useBadgeRowContext();
  const { authData: webSearchAuthData } = webSearch;

  const {
    methods: searchMethods,
    onSubmit: searchOnSubmit,
    isDialogOpen: searchDialogOpen,
    setIsDialogOpen: setSearchDialogOpen,
    handleRevokeApiKey: searchHandleRevoke,
    badgeTriggerRef: searchBadgeTriggerRef,
    menuTriggerRef: searchMenuTriggerRef,
  } = searchApiKeyForm;

  const searchAuthTypes = useMemo(
    () => webSearchAuthData?.authTypes ?? [],
    [webSearchAuthData?.authTypes],
  );

  return (
    <SearchApiKeyDialog
      onSubmit={searchOnSubmit}
      authTypes={searchAuthTypes}
      isOpen={searchDialogOpen}
      onRevoke={searchHandleRevoke}
      register={searchMethods.register}
      onOpenChange={setSearchDialogOpen}
      handleSubmit={searchMethods.handleSubmit}
      triggerRefs={[searchMenuTriggerRef, searchBadgeTriggerRef]}
      isToolAuthenticated={webSearchAuthData?.authenticated ?? false}
    />
  );
}

export default ToolDialogs;
