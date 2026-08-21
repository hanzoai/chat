import { useState } from 'react';
import * as Ariakit from '@ariakit/react';
import {
  Code,
  Globe,
  GraduationCap,
  ImagePlus,
  Images,
  Paperclip,
  Plus,
  Telescope,
  Wrench,
} from 'lucide-react';
import { DropdownPopup, MCPIcon, TooltipAnchor } from '@hanzochat/client';
import { Permissions, PermissionTypes, defaultAgentCapabilities } from '@hanzochat/data-provider';
import type { TConversation } from '@hanzochat/data-provider';
import type { MenuItemProps } from '~/common';
import { useAgentCapabilities, useHasAccess, useLocalize, type TranslationKeys } from '~/hooks';
import { useToolsContext } from '~/Providers';
import { cn } from '~/utils';
import { useAttach } from './Files/useAttach';
import type { Takes } from './Files/useUpload';

/**
 * Everything you can put into a turn, behind one `+`.
 *
 * Files and tools were two controls and are one, because a person opening this
 * has one question — what else goes into this message — and answering it in two
 * places makes them ask which. Files first, tools under a rule.
 *
 * TOOLS ARE FIELDS ON THE TURN'S EPHEMERAL AGENT. `web_search`, `execute_code`,
 * one entry per MCP server: the menu writes those fields and nothing else, and
 * the server reads the same object (`packages/api/src/agents/load.ts`) and turns
 * each field into a tool. There is no second tool system, which is the whole
 * reason the Plugins page could be deleted rather than rebuilt.
 *
 * NOTHING HERE IS GREYED OUT. A row says what it can do in this conversation —
 * "Add photos" where only pictures can be read, "Add files" where anything can —
 * because a disabled control with a tooltip explains a rule instead of applying
 * it. The three tools this build cannot run yet say `Soon` in the slot the
 * shortcut would use: present in the vocabulary, honest about the state, and
 * still reachable by keyboard so nobody has to discover they exist.
 */

/** Named after what the provider can actually read. */
const ADD: Record<Takes, TranslationKeys> = {
  photos: 'com_ui_add_photos',
  files: 'com_ui_add_files',
  both: 'com_ui_add_photos_files',
};

export default function Add({
  conversation,
  disabled,
}: {
  conversation: TConversation | null;
  disabled: boolean;
}) {
  const localize = useLocalize();
  const [open, setOpen] = useState(false);
  const { add, takes, library, enabled, portals } = useAttach(conversation, disabled);
  const { webSearch, codeInterpreter, agentsConfig, mcpServerManager } = useToolsContext();
  const { codeEnabled, webSearchEnabled } = useAgentCapabilities(
    agentsConfig?.capabilities ?? defaultAgentCapabilities,
  );

  const canSearch = useHasAccess({
    permissionType: PermissionTypes.WEB_SEARCH,
    permission: Permissions.USE,
  });
  const canRunCode = useHasAccess({
    permissionType: PermissionTypes.RUN_CODE,
    permission: Permissions.USE,
  });
  const canUseMcp = useHasAccess({
    permissionType: PermissionTypes.MCP_SERVERS,
    permission: Permissions.USE,
  });

  const { mcpValues, selectableServers, toggleServerSelection } = mcpServerManager;
  const servers = canUseMcp ? (selectableServers ?? []) : [];

  /** A tool the product names and this build cannot run yet. */
  const soon = (id: string, label: TranslationKeys, icon: React.ReactNode): MenuItemProps => ({
    id,
    label: localize(label),
    icon,
    kbd: localize('com_ui_soon'),
    hideOnClick: false,
  });

  const items: MenuItemProps[] = [];

  if (enabled) {
    items.push({
      id: 'add-files',
      label: localize(ADD[takes]),
      icon: <Paperclip className="icon-md" aria-hidden="true" />,
      onClick: add,
    });
  }
  if (library) {
    items.push({
      id: 'add-library',
      label: localize('com_ui_add_from_library'),
      icon: <Images className="icon-md" aria-hidden="true" />,
      onClick: library,
    });
  }
  if (items.length > 0) {
    items.push({ id: 'add-rule', separate: true });
  }

  if (canSearch && webSearchEnabled) {
    items.push({
      id: 'tool-search',
      label: localize('com_ui_web_search'),
      icon: <Globe className="icon-md" aria-hidden="true" />,
      ariaChecked: webSearch.isToolEnabled,
      hideOnClick: false,
      /* The key form is not a row. `useToolToggle` opens it by itself when the
       * tool has no credential, so asking for the tool is the whole gesture. */
      onClick: () => webSearch.debouncedChange({ value: !webSearch.isToolEnabled }),
    });
  }
  items.push(soon('tool-image', 'com_ui_create_image', <ImagePlus className="icon-md" />));
  items.push(soon('tool-research', 'com_ui_deep_research', <Telescope className="icon-md" />));
  if (canRunCode && codeEnabled) {
    items.push({
      id: 'tool-code',
      label: localize('com_ui_write_code'),
      icon: <Code className="icon-md" aria-hidden="true" />,
      ariaChecked: codeInterpreter.isToolEnabled,
      hideOnClick: false,
      onClick: () => codeInterpreter.debouncedChange({ value: !codeInterpreter.isToolEnabled }),
    });
  }
  items.push(soon('tool-study', 'com_ui_study', <GraduationCap className="icon-md" />));

  /* The long tail, disclosed rather than listed: a deployment can connect any
   * number of servers, and the five above are the ones everybody has. */
  if (servers.length > 0) {
    items.push({
      id: 'tool-all',
      label: localize('com_ui_view_all_tools'),
      icon: <Wrench className="icon-md" aria-hidden="true" />,
      subItems: servers.map((server) => ({
        id: `tool-mcp-${server.serverName}`,
        label: server.serverName,
        icon: <MCPIcon className="icon-md" aria-hidden="true" />,
        ariaChecked: mcpValues?.includes(server.serverName) ?? false,
        hideOnClick: false,
        onClick: () => toggleServerSelection(server.serverName),
      })),
    });
  }

  items.push({
    id: 'add-hint',
    separate: true,
  });
  items.push({
    id: 'add-slash',
    render: (
      <div className="px-3 py-1.5 text-xs text-text-secondary-alt md:px-2.5">
        {localize('com_ui_slash_hint')}
      </div>
    ),
  });

  return (
    <>
      {portals}
      <DropdownPopup
        portal={true}
        focusLoop={true}
        unmountOnHide={true}
        isOpen={open}
        setIsOpen={setOpen}
        menuId="composer-add-menu"
        className="bottom-full mb-2"
        items={items}
        trigger={
          <TooltipAnchor
            description={localize('com_ui_add')}
            render={
              <Ariakit.MenuButton
                disabled={disabled}
                aria-label={localize('com_ui_add')}
                /* Lit from the boolean this component already holds. Ariakit
                 * never writes `data-state`, so the Radix open-state variant
                 * this used to ask for selected nothing and the "+" stayed
                 * unlit for the whole time its menu was on screen. */
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50',
                  open && 'bg-surface-hover',
                )}
              >
                <Plus className="size-5" aria-hidden="true" focusable="false" />
              </Ariakit.MenuButton>
            }
          />
        }
      />
    </>
  );
}
