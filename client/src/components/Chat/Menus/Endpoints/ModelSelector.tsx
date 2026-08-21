import React, { useId, useMemo, useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { ChevronDown } from 'lucide-react';
import { DropdownPopup, TooltipAnchor } from '@hanzochat/client';
import {
  getConfigDefaults,
  isAgentsEndpoint,
  isAssistantsEndpoint,
} from '@hanzochat/data-provider';
import type * as t from '@hanzochat/data-provider';
import type { Endpoint, MenuItemProps, ModelSelectorProps } from '~/common';
import { CONTROL, CONTROL_OPEN } from '~/components/chrome';
import useSelectMention from '~/hooks/Input/useSelectMention';
import { useGetEndpointsQuery } from '~/data-provider';
import { useEndpoints, useLocalize } from '~/hooks';
import { useChatContext } from '~/Providers';
import SpecIcon from './components/SpecIcon';
import { cn } from '~/utils';

/**
 * Which model answers you — the whole question, asked once.
 *
 * This surface used to ask it five times. A person opened the menu onto a list
 * of ENDPOINTS, hovered one to reveal its MODELS, and had two more lists beside
 * them for AGENTS and ASSISTANTS, with PRESETS in a separate menu of their own
 * naming the same pairs again. Five words for one decision, four of which mean
 * nothing to anyone who has not read the config file.
 *
 * There is one word now, and it is `model`. The endpoint still exists — it is
 * the address the request needs — but it travels WITH the model as one choice
 * rather than being chosen first. Presets are gone. Agents and assistants are
 * not models and are not listed here; they have their own home.
 *
 * The list leads with a few models named for the job they do and keeps the rest
 * of the catalog one click further on, because a first-time visitor picking
 * between `zen5-pro` and `qwen3-coder` is being asked to know something we
 * already know for them.
 */

/**
 * What the picker leads with when the deployment has not named its own models.
 *
 * These are jobs, not SKUs: the point of the row is that you can pick it without
 * knowing what a `zen5` is. A row appears only when the deployment actually
 * serves that model, so trimming the catalog drops the row instead of offering a
 * pick that 404s — and a deployment that declares `modelSpecs` names its models
 * itself, in which case this table is never read.
 */
const LEAD: ReadonlyArray<{ model: string; label: string }> = [
  { model: 'enso', label: 'Auto' },
  { model: 'zen5-flash', label: 'Instant' },
  { model: 'zen5-pro', label: 'Thinking' },
  { model: 'zen5-coder', label: 'Code' },
];

/** One pick. `endpoint` and `model` are the address; `label` is the only part read aloud. */
export type Choice = {
  id: string;
  label: string;
  endpoint: string;
  model: string;
  icon: React.ReactNode;
  spec?: t.TModelSpec;
};

/**
 * The catalog as one flat list, split into what the picker leads with and what
 * sits behind "More models".
 *
 * Three kinds of endpoint are left out, each for its own reason: agents and
 * assistants are not models, and an endpoint whose key the person has to supply
 * cannot be picked from a header that does not ask for one.
 */
export function choices(
  endpoints: Endpoint[],
  needsKey: (endpoint: string) => boolean,
  specs: t.TModelSpec[],
  endpointsConfig: t.TEndpointsConfig,
): { lead: Choice[]; rest: Choice[] } {
  const all: Choice[] = [];
  for (const endpoint of endpoints) {
    if (
      isAgentsEndpoint(endpoint.value) ||
      isAssistantsEndpoint(endpoint.value) ||
      needsKey(endpoint.value)
    ) {
      continue;
    }
    for (const { name } of endpoint.models ?? []) {
      all.push({
        id: `${endpoint.value}/${name}`,
        label: name,
        endpoint: endpoint.value,
        model: name,
        icon: endpoint.icon,
      });
    }
  }

  const lead: Choice[] = specs.length
    ? specs.map((spec) => ({
        id: `${spec.preset.endpoint ?? ''}/${spec.preset.model ?? ''}`,
        label: spec.label || spec.name,
        endpoint: spec.preset.endpoint ?? '',
        model: spec.preset.model ?? '',
        icon: <SpecIcon currentSpec={spec} endpointsConfig={endpointsConfig} />,
        spec,
      }))
    : LEAD.flatMap(({ model, label }) => {
        const served = all.find((choice) => choice.model === model);
        return served ? [{ ...served, label }] : [];
      });

  const led = new Set(lead.map((choice) => choice.id));
  return { lead, rest: all.filter((choice) => !led.has(choice.id)) };
}

export default function ModelSelector({ startupConfig }: ModelSelectorProps) {
  const localize = useLocalize();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { conversation, newConversation } = useChatContext();
  const { data: endpointsConfig } = useGetEndpointsQuery();

  const specs = useMemo(() => startupConfig?.modelSpecs?.list ?? [], [startupConfig]);
  const { mappedEndpoints, endpointRequiresUserKey } = useEndpoints({
    startupConfig,
    endpointsConfig: endpointsConfig ?? {},
  });

  const { lead, rest } = useMemo(
    () => choices(mappedEndpoints, endpointRequiresUserKey, specs, endpointsConfig ?? {}),
    [mappedEndpoints, endpointRequiresUserKey, specs, endpointsConfig],
  );

  const { onSelectEndpoint, onSelectSpec } = useSelectMention({
    modelSpecs: specs,
    conversation,
    newConversation,
    endpointsConfig: endpointsConfig ?? {},
    returnHandlers: true,
  });

  /* A conversation records the spec it was started from when it had one, so a
     named model keeps its name; anything else is found by the address it runs
     under. */
  const current = useMemo(() => {
    const all = [...lead, ...rest];
    if (conversation?.spec) {
      const named = all.find((choice) => choice.spec?.name === conversation.spec);
      if (named) {
        return named;
      }
    }
    return all.find(
      (choice) =>
        choice.endpoint === conversation?.endpoint && choice.model === conversation?.model,
    );
  }, [lead, rest, conversation?.spec, conversation?.endpoint, conversation?.model]);

  const items = useMemo(() => {
    const row = (choice: Choice): MenuItemProps => ({
      id: choice.id,
      label: choice.label,
      icon: choice.icon,
      ariaChecked: choice.id === current?.id,
      onClick: () => {
        if (choice.spec) {
          onSelectSpec?.(choice.spec);
        } else {
          onSelectEndpoint?.(choice.endpoint, { model: choice.model });
        }
      },
    });

    /* Nothing curated and nothing named: the catalog IS the list, so there is
       nothing to hold back and no row that would open it. */
    if (lead.length === 0) {
      return rest.map(row);
    }
    if (rest.length === 0) {
      return lead.map(row);
    }
    if (showAll) {
      return [...lead.map(row), { separate: true }, ...rest.map(row)];
    }
    return [
      ...lead.map(row),
      { separate: true },
      {
        id: 'more-models',
        /* Untranslated: the locales are another slice's to edit and this string
           has no key yet. `com_ui_more_models` is the one to add. */
        label: 'More models',
        hideOnClick: false,
        onClick: () => setShowAll(true),
      },
    ];
  }, [lead, rest, showAll, current?.id, onSelectEndpoint, onSelectSpec]);

  /* A deployment can decide nobody picks a model. Its own list still wins over
     the switch, which is how a curated set is offered without opening the
     catalog behind it. */
  const interfaceConfig = startupConfig?.interface ?? getConfigDefaults().interface;
  if ((interfaceConfig.modelSelect === false && specs.length === 0) || items.length === 0) {
    return null;
  }

  return (
    <DropdownPopup
      portal={true}
      menuId={menuId}
      focusLoop={true}
      unmountOnHide={true}
      isOpen={open}
      /* Reopening starts at the short list again. "More models" answers one
         question, and holding the answer open turns the catalog into the
         default view of a picker built to hide it. */
      setIsOpen={(next) => {
        setOpen(next);
        if (!next) {
          setShowAll(false);
        }
      }}
      trigger={
        <TooltipAnchor
          description={localize('com_ui_select_model')}
          render={
            <Ariakit.MenuButton
              id="model-menu-button"
              aria-label={localize('com_ui_select_model')}
              /* CONTROL is a square; this one carries a name, so it keeps the
                 row's height, radius, ground and glyph size and takes the width
                 its label needs. */
              className={cn(
                CONTROL,
                'h-11 w-auto gap-1.5 px-3 text-sm font-medium',
                open && CONTROL_OPEN,
              )}
            >
              <span className="truncate">
                {current?.label ?? conversation?.model ?? localize('com_ui_select_model')}
              </span>
              <ChevronDown className="opacity-60" aria-hidden="true" />
            </Ariakit.MenuButton>
          }
        />
      }
      items={items}
    />
  );
}
