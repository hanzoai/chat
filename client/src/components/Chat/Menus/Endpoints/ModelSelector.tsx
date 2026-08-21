import React, { useId, useMemo, useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { ChevronDown } from 'lucide-react';
import { isFree } from '@hanzo/ai';
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
import { cn, label as written } from '~/utils';
import SpecIcon from './components/SpecIcon';

/**
 * How hard should it think — one question, asked in adjectives.
 *
 * This surface used to ask five. A person opened the menu onto a list of
 * ENDPOINTS, hovered one to reveal its MODELS, and had AGENTS and ASSISTANTS
 * beside them as though those were models too, with a separate PRESETS menu
 * naming the same pairs over again. Five words for one decision, four of which
 * mean nothing to anyone who has not read the config file.
 *
 * The fix is not to rename those five well. A consumer is not choosing an
 * identity — they are choosing how much effort to spend on this question — so
 * the control sells effort and no slug is read aloud in the first list.
 *
 * The three stops are NOT an axis invented here. The gateway already ships one:
 * `enso-flash`, `enso` and `enso-ultra` are three tiers of one router, which
 * reads each prompt and sends it to the best-fit model underneath, so an easy
 * turn stays cheap and only a hard one escalates. Instant / Medium / High name
 * what those tiers DO. Inventing a tiering on top would promise an effort the
 * gateway has no way to honour.
 *
 * Model choice still exists, and keeping it is a deliberate difference from the
 * reference: breadth of models is something this product sells. It lives behind
 * `Advanced`, never in the first list, with the reset that any surface offering
 * that much rope has to carry.
 *
 * TWO THINGS ARE DELIBERATELY ABSENT.
 *
 * There is no free-tier `Think` boolean, because this app cannot tell a free
 * user from a paying one and I will not guess. `TUser` carries no plan;
 * `TUsageResponse.tier` is a display string whose value is whatever was typed
 * into Commerce, and it is fetched only behind `balanceOn(startupConfig)`,
 * which is off here. The plan is known server-side (`api/server/services/
 * plan.js`) and never serialized, and that file's own rule is that a plan which
 * did not answer counts as PAID. Rendering one control for everyone is the
 * honest reading of that; the fix is to publish the plan, not to infer it.
 *
 * There is no per-message override. That belongs on the send button, which is
 * the composer's.
 */

/**
 * The effort axis, in gateway terms.
 *
 * A stop appears only when the deployment serves its tier, so trimming the
 * catalog drops the stop rather than offering an effort nothing answers to.
 */
const STOPS: ReadonlyArray<{
  model: string;
  /** English, and the fallback for a stop with no key of its own. */
  name: string;
  key?: 'com_ui_medium' | 'com_ui_high';
  costly?: boolean;
}> = [
  /* Instant has no key: `com_ui_instant` does not exist yet, and `com_ui_low` —
     which does — is the wrong word twice over. It names the mechanism instead
     of the outcome, and it warns about the answer where this promises something
     about the wait. */
  { model: 'enso-flash', name: 'Instant' },
  { model: 'enso', name: 'Medium', key: 'com_ui_medium' },
  { model: 'enso-ultra', name: 'High', key: 'com_ui_high', costly: true },
];

/** One pick. `endpoint` and `model` are the address; only `name` is read aloud. */
export type Choice = {
  id: string;
  name: string;
  endpoint: string;
  model: string;
  icon?: React.ReactNode;
  spec?: t.TModelSpec;
};

/**
 * Everything the deployment serves, as one flat list.
 *
 * Four things are left out, each for its own reason. Agents and assistants are
 * not models. An endpoint whose key the person has to supply cannot be picked
 * from a header that never asks for one. And the FREE ROUTE is not a choice —
 * it is where the gateway lands you when a paid route is spent or down, and for
 * a free-plan caller the server sorts it to the front of the list
 * (`leadFree`, api/server/controllers/ModelController.js), so left in it would
 * be both the first row offered and the one thing nobody can usefully ask for.
 */
export function models(
  endpoints: Endpoint[],
  needsKey: (endpoint: string) => boolean,
  specs: t.TModelSpec[],
  endpointsConfig: t.TEndpointsConfig,
): Choice[] {
  if (specs.length > 0) {
    return specs
      .filter((spec) => !isFree(spec.preset.model))
      .map((spec) => ({
        id: `${spec.preset.endpoint ?? ''}/${spec.preset.model ?? ''}`,
        name: spec.label || spec.name,
        endpoint: spec.preset.endpoint ?? '',
        model: spec.preset.model ?? '',
        icon: <SpecIcon currentSpec={spec} endpointsConfig={endpointsConfig} />,
        spec,
      }));
  }

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
      if (isFree(name)) {
        continue;
      }
      all.push({
        id: `${endpoint.value}/${name}`,
        name: written(name),
        endpoint: endpoint.value,
        model: name,
        icon: endpoint.icon,
      });
    }
  }
  return all;
}

/** The effort stops this deployment can honour, in order. */
export function stops(
  available: Choice[],
  localize: ReturnType<typeof useLocalize>,
): Array<Choice & { costly?: boolean }> {
  return STOPS.flatMap(({ model, name, key, costly }) => {
    const served = available.find((choice) => choice.model === model);
    return served ? [{ ...served, name: key ? localize(key) : name, costly }] : [];
  });
}

export default function ModelSelector({ startupConfig }: ModelSelectorProps) {
  const localize = useLocalize();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const { conversation, newConversation } = useChatContext();
  const { data: endpointsConfig } = useGetEndpointsQuery();

  const specs = useMemo(() => startupConfig?.modelSpecs?.list ?? [], [startupConfig]);
  const { mappedEndpoints, endpointRequiresUserKey } = useEndpoints({
    startupConfig,
    endpointsConfig: endpointsConfig ?? {},
  });

  const available = useMemo(
    () => models(mappedEndpoints, endpointRequiresUserKey, specs, endpointsConfig ?? {}),
    [mappedEndpoints, endpointRequiresUserKey, specs, endpointsConfig],
  );
  const effort = useMemo(() => stops(available, localize), [available, localize]);

  const { onSelectEndpoint, onSelectSpec } = useSelectMention({
    modelSpecs: specs,
    conversation,
    newConversation,
    endpointsConfig: endpointsConfig ?? {},
    returnHandlers: true,
  });

  /* Default = the first model of the first endpoint, which is the order the
     deployment declared and the order a fresh conversation already resolves.
     Reset has to mean what the app means by it, so it reads that order rather
     than naming a model of its own. */
  const fallback = available[0];

  /* What the trigger says.
     Stops come FIRST, and that ordering is the whole point rather than a
     preference: a stop and its model are the same row under two names, and
     reading the model's name would put `Enso` in the header for the person who
     never opened the menu — the one slug this control exists to not say. A
     model chosen deliberately under `Advanced` has no adjective and reads as
     itself, which is what that surface is for.
     A conversation also records the spec it started from when it had one, so a
     deployment-named model keeps the name the deployment gave it. */
  const current = useMemo(() => {
    const all = [...effort, ...available];
    if (conversation?.spec != null && conversation.spec !== '') {
      const named = all.find((choice) => choice.spec?.name === conversation.spec);
      if (named) {
        return named;
      }
    }
    return all.find(
      (choice) =>
        choice.endpoint === conversation?.endpoint && choice.model === conversation?.model,
    );
  }, [effort, available, conversation?.spec, conversation?.endpoint, conversation?.model]);

  const items = useMemo(() => {
    const pick = (choice: Choice) => () => {
      if (choice.spec) {
        onSelectSpec?.(choice.spec);
      } else {
        onSelectEndpoint?.(choice.endpoint, { model: choice.model });
      }
    };

    const row = (choice: Choice): MenuItemProps => ({
      id: choice.id,
      label: choice.name,
      icon: choice.icon,
      ariaChecked: choice.id === current?.id,
      onClick: pick(choice),
    });

    /* No effort axis to present, so the models become the first list. A menu
       whose only row opens another menu is worse than a plain list. */
    if (effort.length === 0) {
      return available.map(row);
    }

    return [
      ...effort.map((stop) => ({
        ...row(stop),
        /* The cost sits on the row that charges it, and it is spent in usage
           rather than in tokens — a unit nobody outside this building budgets
           in. `MenuItemProps` has no second line, so the row is rendered rather
           than labelled; Ariakit lets a `render` element bring its own
           children, which replace the ones the menu would have written. */
        render: stop.costly
          ? (props: React.HTMLAttributes<HTMLElement>) => (
              <button {...props}>
                <span className="flex flex-col items-start">
                  <span>{stop.name}</span>
                  <span className="text-xs font-normal text-text-secondary-alt">
                    Consumes usage limits faster
                  </span>
                </span>
              </button>
            )
          : undefined,
      })),
      { separate: true },
      {
        id: 'advanced',
        label: localize('com_ui_advanced'),
        subItems: [
          ...available.map(row),
          { separate: true },
          {
            id: 'reset',
            /* `com_ui_reset` is a bare "Reset", which does not say to what. */
            label: 'Reset to default',
            disabled: fallback == null,
            onClick: fallback ? pick(fallback) : undefined,
          },
        ],
      },
    ];
  }, [effort, available, current?.id, fallback, localize, onSelectEndpoint, onSelectSpec]);

  /* A deployment can decide nobody chooses. Its own list still wins over the
     switch, which is how a curated set is offered without opening the catalog
     behind it. */
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
      setIsOpen={setOpen}
      trigger={
        <TooltipAnchor
          /* Untranslated, and `com_ui_select_model` is NOT the fallback: this
             control never says "model", so neither should the name a screen
             reader reads out. `com_ui_intelligence` is the key to add. */
          description="Intelligence"
          render={
            <Ariakit.MenuButton
              id="model-menu-button"
              aria-label="Intelligence"
              /* CONTROL is a square; this one carries a name, so it keeps the
                 row's height, radius, ground and glyph size and takes the width
                 its label needs. */
              className={cn(
                CONTROL,
                'h-11 w-auto gap-1.5 px-3 text-sm font-medium',
                open && CONTROL_OPEN,
              )}
            >
              <span className="truncate">{current?.name ?? localize('com_ui_medium')}</span>
              <ChevronDown className="opacity-60" aria-hidden="true" />
            </Ariakit.MenuButton>
          }
        />
      }
      items={items}
    />
  );
}
