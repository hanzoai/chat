import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { TooltipAnchor } from '@hanzochat/client';
import { getConfigDefaults } from '@hanzochat/data-provider';
import type { ModelSelectorProps } from '~/common';
import {
  renderModelSpecs,
  renderEndpoints,
  renderSearchResults,
  renderCustomGroups,
} from './components';
import { ModelSelectorProvider, useModelSelectorContext } from './ModelSelectorContext';
import { ModelSelectorChatProvider } from './ModelSelectorChatContext';
import { getSelectedIcon, getDisplayValue } from './utils';
import { CustomMenu as Menu } from './CustomMenu';
import DialogManager from './DialogManager';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

function ModelSelectorContent({ variant }: { variant: 'block' | 'inline' }) {
  const localize = useLocalize();
  const isInline = variant === 'inline';

  const {
    // Chat
    agentsMap,
    modelSpecs,
    mappedEndpoints,
    endpointsConfig,
    // State
    searchValue,
    searchResults,
    selectedValues,
    // Functions
    setSearchValue,
    setSelectedValues,
    // Dialog
    keyDialogOpen,
    onOpenChange,
    keyDialogEndpoint,
  } = useModelSelectorContext();

  const selectedIcon = useMemo(
    () =>
      getSelectedIcon({
        mappedEndpoints: mappedEndpoints ?? [],
        selectedValues,
        modelSpecs,
        endpointsConfig,
      }),
    [mappedEndpoints, selectedValues, modelSpecs, endpointsConfig],
  );
  const selectedDisplayValue = useMemo(
    () =>
      getDisplayValue({
        localize,
        agentsMap,
        modelSpecs,
        selectedValues,
        mappedEndpoints,
      }),
    [localize, agentsMap, modelSpecs, selectedValues, mappedEndpoints],
  );

  const trigger = (
    <TooltipAnchor
      aria-label={localize('com_ui_select_model')}
      description={localize('com_ui_select_model')}
      render={
        <button
          className={cn(
            'flex items-center gap-2 text-sm text-text-primary hover:bg-surface-active-alt',
            isInline
              ? // A ghost pill on the composer's action row: transparent at rest,
                // a ground only under the pointer — the "no plate until you point"
                // law the chrome row already wears. It sizes to its label, caps
                // its width, and truncates a long model name.
                'h-9 max-w-[45vw] rounded-lg px-2 text-text-secondary hover:text-text-primary'
              : 'my-1 h-10 w-full max-w-[70vw] justify-center rounded-xl border border-border-light bg-presentation px-3 py-2',
          )}
          aria-label={localize('com_ui_select_model')}
        >
          {selectedIcon && React.isValidElement(selectedIcon) && (
            <div
              className={cn(
                'flex flex-shrink-0 items-center justify-center overflow-hidden',
                isInline && '[&_svg]:size-4',
              )}
            >
              {selectedIcon}
            </div>
          )}
          <span className={cn('truncate text-left', !isInline && 'flex-grow')}>
            {selectedDisplayValue}
          </span>
          {isInline && (
            <ChevronDown className="size-4 flex-shrink-0 opacity-60" aria-hidden="true" />
          )}
        </button>
      }
    />
  );

  return (
    <div
      className={cn(
        'relative flex',
        isInline ? 'items-center' : 'w-full max-w-md flex-col items-center gap-2',
      )}
    >
      <Menu
        bare={isInline}
        values={selectedValues}
        onValuesChange={(values: Record<string, any>) => {
          setSelectedValues({
            endpoint: values.endpoint || '',
            model: values.model || '',
            modelSpec: values.modelSpec || '',
          });
        }}
        onSearch={(value) => setSearchValue(value)}
        combobox={<input id="model-search" placeholder=" " />}
        comboboxLabel={localize('com_endpoint_search_models')}
        trigger={trigger}
      >
        {searchResults ? (
          renderSearchResults(searchResults, localize, searchValue)
        ) : (
          <>
            {/* Render ungrouped modelSpecs (no group field) */}
            {renderModelSpecs(
              modelSpecs?.filter((spec) => !spec.group) || [],
              selectedValues.modelSpec || '',
            )}
            {/* Render endpoints (will include grouped specs matching endpoint names) */}
            {renderEndpoints(mappedEndpoints ?? [])}
            {/* Render custom groups (specs with group field not matching any endpoint) */}
            {renderCustomGroups(modelSpecs || [], mappedEndpoints ?? [])}
          </>
        )}
      </Menu>
      <DialogManager
        keyDialogOpen={keyDialogOpen}
        onOpenChange={onOpenChange}
        endpointsConfig={endpointsConfig || {}}
        keyDialogEndpoint={keyDialogEndpoint || undefined}
      />
    </div>
  );
}

export default function ModelSelector({ startupConfig, variant = 'block' }: ModelSelectorProps) {
  const interfaceConfig = startupConfig?.interface ?? getConfigDefaults().interface;
  const modelSpecs = startupConfig?.modelSpecs?.list ?? [];

  // Hide the selector when modelSelect is false and there are no model specs to show
  if (interfaceConfig.modelSelect === false && modelSpecs.length === 0) {
    return null;
  }

  return (
    <ModelSelectorChatProvider>
      <ModelSelectorProvider startupConfig={startupConfig}>
        <ModelSelectorContent variant={variant} />
      </ModelSelectorProvider>
    </ModelSelectorChatProvider>
  );
}
