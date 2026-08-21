import React, { useMemo } from 'react';
import SearchApiKeyDialog from '~/components/SidePanel/Agents/Search/ApiKeyDialog';
import MCPConfigDialog from '~/components/MCP/MCPConfigDialog';
import { useBadgeRowContext } from '~/Providers';

/**
 * What a tool asks for before it can run, for every tool that asks.
 *
 * These are not settings and there is no control that opens them: asking for
 * the tool IS the gesture, and the machinery behind it opens the form when the
 * credential it needs is missing. That is why they are mounted beside the
 * composer rather than hung off a gear in the Tools menu — a second way in
 * would be a second thing to find.
 *
 * The code interpreter asks for nothing: a sandbox runs under the caller's own
 * Hanzo IAM bearer, so there is no key to type and nowhere to put one.
 */
function ToolDialogs() {
  const { webSearch, searchApiKeyForm, mcpServerManager, storageContextKey } = useBadgeRowContext();
  const { authData: webSearchAuthData } = webSearch;
  const mcpConfig = mcpServerManager.getConfigDialogProps();

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
    <>
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
      {mcpConfig && <MCPConfigDialog {...mcpConfig} storageContextKey={storageContextKey} />}
    </>
  );
}

export default ToolDialogs;
