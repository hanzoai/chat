import { memo } from 'react';
import { MCPIcon, Spinner } from '@hanzochat/client';
import { PermissionTypes, Permissions } from '@hanzochat/data-provider';
import MCPServerStatusIcon from '~/components/MCP/MCPServerStatusIcon';
import MCPConfigDialog from '~/components/MCP/MCPConfigDialog';
import { getStatusColor, getStatusTextKey } from '~/components/MCP/mcpServerUtils';
import type { MCPServerStatusIconProps } from '~/components/MCP/MCPServerStatusIcon';
import type { ConnectionStatusMap } from '~/components/MCP/mcpServerUtils';
import type { MCPServerDefinition } from '~/hooks/MCP/useMCPServerManager';
import { useLocalize, useHasAccess, useMCPServerManager } from '~/hooks';
import { cn } from '~/utils';

/**
 * The apps this account has connected, and whether each one is reachable.
 *
 * The composer's tools menu picks which of them a MESSAGE may use; this picks
 * whether they are connected at all. Same servers, same status, two different
 * questions — so the row here carries the connect / authorize / configure
 * action and no checkbox, and the menu there carries the checkbox and the same
 * action. Both read one `useMCPServerManager`, so neither holds an opinion of
 * its own about what is connected.
 *
 * It lists every configured server rather than the menu's subset: a server a
 * deployment keeps out of the chat menu still has an account of yours attached
 * to it, and hiding it here is how a connection becomes unrevokable.
 */
function Row({
  server,
  status,
  connecting,
  statusIcon,
}: {
  server: MCPServerDefinition;
  status?: ConnectionStatusMap;
  connecting: (name: string) => boolean;
  statusIcon: MCPServerStatusIconProps;
}) {
  const localize = useLocalize();
  const name = server.config?.title || server.serverName;
  const text = localize(
    getStatusTextKey(server.serverName, status, connecting) as Parameters<typeof localize>[0],
  );

  return (
    <li className="flex items-center gap-3 py-2">
      <div className="relative flex-shrink-0">
        {server.config?.iconPath ? (
          <img
            src={server.config.iconPath}
            className="h-8 w-8 rounded-lg object-cover"
            alt=""
            aria-hidden="true"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-tertiary">
            <MCPIcon className="h-5 w-5 text-text-secondary" aria-hidden="true" />
          </div>
        )}
        <div
          aria-hidden="true"
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-secondary',
            getStatusColor(server.serverName, status, connecting),
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-text-primary">{name}</div>
        <p className="truncate text-xs text-text-secondary">
          {server.config?.description ? `${server.config.description} · ${text}` : text}
        </p>
      </div>

      {statusIcon && (
        <div className="flex-shrink-0">
          <MCPServerStatusIcon {...statusIcon} />
        </div>
      )}
    </li>
  );
}

function Apps() {
  const localize = useLocalize();
  const canUse = useHasAccess({
    permissionType: PermissionTypes.MCP_SERVERS,
    permission: Permissions.USE,
  });
  const {
    availableMCPServers,
    connectionStatus,
    isInitializing,
    isLoading,
    getServerStatusIconProps,
    getConfigDialogProps,
  } = useMCPServerManager();

  /* Permission is read BEFORE the query's state, because the query is disabled
     for anyone who cannot use MCP — and a disabled query reports `loading`
     forever, so asking it first spins at a visitor who was never going to be
     shown a list. */
  if (!canUse) {
    return (
      <div className="p-1 text-sm text-text-secondary">{localize('com_nav_plugins_body')}</div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }

  if (availableMCPServers.length === 0) {
    return (
      <div className="p-1 text-sm text-text-secondary">{localize('com_nav_plugins_body')}</div>
    );
  }

  const dialog = getConfigDialogProps();

  return (
    <div className="p-1 text-sm text-text-primary">
      <ul className="flex flex-col divide-y divide-border-light">
        {availableMCPServers.map((server) => (
          <Row
            key={server.serverName}
            server={server}
            status={connectionStatus}
            connecting={isInitializing}
            statusIcon={getServerStatusIconProps(server.serverName)}
          />
        ))}
      </ul>
      {dialog && <MCPConfigDialog {...dialog} />}
    </div>
  );
}

export default memo(Apps);
