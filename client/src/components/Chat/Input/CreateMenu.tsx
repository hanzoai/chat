import { useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { useNavigate } from 'react-router-dom';
import { FileText, Presentation, Sheet, Globe, Bot, Plus, Settings2 } from 'lucide-react';
import { DropdownPopup, TooltipAnchor } from '@hanzochat/client';
import type { TConversation } from '@hanzochat/data-provider';
import { openAppBuilder } from '~/utils/buildApp';
import { useSubmitMessage } from '~/hooks';
import { useLocalize } from '~/hooks';
import { useToolsItems } from './ToolsDropdown';
import { useAttach } from './Files/useAttach';

/**
 * Make something from here: the composer's "+".
 *
 * Four outputs and the agents that make them, from one control on the arrival
 * screen — the "create a file or site" the outputs panel offers, reached where
 * the visitor already is.
 *
 * A document, a deck and a sheet are what enso PRODUCES — they render as
 * artifacts in the panel beside the thread — so choosing one seeds the composer
 * with the ask and sends it; the result is a real, editable artifact, not a
 * blank editor chat never had. A site is hanzo.app's to build, so that one
 * hands off to the builder. Agents opens the roster. One idea, one control.
 */
const PROMPTS = {
  document: 'Create a new document I can edit. Start with a short outline and a first draft.',
  presentation: 'Create a new slide presentation. Start with a title slide and an outline of the sections.',
  spreadsheet: 'Create a new spreadsheet. Start with sensible column headers and a few example rows.',
} as const;

export default function CreateMenu({
  conversation,
  disableInputs,
}: {
  conversation: TConversation | null;
  disableInputs: boolean;
}) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { submitMessage } = useSubmitMessage();
  const [open, setOpen] = useState(false);
  // The turn's tools, as a submenu — same items the standalone dropdown drew,
  // from the same hook, so there is no second copy of the toggles or the pins.
  const toolsItems = useToolsItems();
  // Attaching, from the same hook the standalone button used. Its `portals` —
  // the hidden file input and the two dialogs — are rendered HERE and nowhere
  // else; a second consumer would mean a second input and a second dialog set.
  const { items: attachItems, portals } = useAttach(conversation, disableInputs);

  const make = (kind: keyof typeof PROMPTS) => submitMessage({ text: PROMPTS[kind] });

  const items = [
    // Attaching first: it is far and away the most-reached thing behind this
    // control, and it is what the button that used to sit beside "+" did.
    ...(attachItems.length
      ? [...attachItems, { separator: true, render: () => <div className="my-1 h-px bg-border-light" /> }]
      : []),
    {
      label: localize('com_ui_create_document'),
      onClick: () => make('document'),
      icon: <FileText className="icon-md mr-2 text-text-secondary" />,
      render: (props: React.HTMLAttributes<HTMLButtonElement>) => <button {...props} />,
    },
    {
      label: localize('com_ui_create_presentation'),
      onClick: () => make('presentation'),
      icon: <Presentation className="icon-md mr-2 text-text-secondary" />,
      render: (props: React.HTMLAttributes<HTMLButtonElement>) => <button {...props} />,
    },
    {
      label: localize('com_ui_create_spreadsheet'),
      onClick: () => make('spreadsheet'),
      icon: <Sheet className="icon-md mr-2 text-text-secondary" />,
      render: (props: React.HTMLAttributes<HTMLButtonElement>) => <button {...props} />,
    },
    {
      label: localize('com_ui_create_site'),
      onClick: () => openAppBuilder(),
      icon: <Globe className="icon-md mr-2 text-text-secondary" />,
      render: (props: React.HTMLAttributes<HTMLButtonElement>) => <button {...props} />,
    },
    { separator: true, render: () => <div className="my-1 h-px bg-border-light" /> },
    {
      label: localize('com_ui_agents'),
      onClick: () => navigate('/agents'),
      icon: <Bot className="icon-md mr-2 text-text-secondary" />,
      render: (props: React.HTMLAttributes<HTMLButtonElement>) => <button {...props} />,
    },
    // Tools last, and only when the turn actually has any: a submenu that opens
    // onto nothing is worse than an absent one.
    ...(toolsItems.length
      ? [
          { separator: true, render: () => <div className="my-1 h-px bg-border-light" /> },
          {
            label: localize('com_ui_tools'),
            icon: <Settings2 className="icon-md mr-2 text-text-secondary" />,
            subItems: toolsItems,
          },
        ]
      : []),
  ];

  return (
    <>
      {portals}
      <DropdownPopup
      portal={true}
      menuId="composer-create-menu"
      focusLoop={true}
      unmountOnHide={true}
      isOpen={open}
      setIsOpen={setOpen}
      trigger={
        <TooltipAnchor
          description={localize('com_ui_create')}
          render={
            <Ariakit.MenuButton
              aria-label={localize('com_ui_create')}
              className="flex size-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-hover radix-state-open:bg-surface-hover"
            >
              <Plus className="size-5" aria-hidden="true" focusable="false" />
            </Ariakit.MenuButton>
          }
        />
      }
      items={items}
      className="bottom-full mb-2"
      />
    </>
  );
}
