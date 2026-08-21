import React, { useState, useRef } from 'react';
import { Tabs } from '@hanzo/ui/primitives/Tabs';
import { TabsList } from '@hanzo/ui/primitives/TabsList';
import { TabsTrigger } from '@hanzo/ui/primitives/TabsTrigger';
import { TabsContent } from '@hanzo/ui/primitives/TabsContent';
import { Bell, Plug } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { GearIcon, UserIcon, useMediaQuery, PersonalizationIcon } from '@hanzochat/client';
import type { TDialogProps } from '~/common';
import { General, Notifications, Personalization, Apps, Account } from './SettingsTabs';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * Five tabs, and the same five for everyone.
 *
 * What is NOT here is the point of the list. Parameters, presets, endpoints,
 * models, speech engines, token balances and command toggles were tabs of their
 * own; none of them is a thing a person came here to decide. A control that
 * only a developer can name does not get a home on a consumer surface — it goes
 * where the deployment configures it, or it goes.
 *
 * The strip is also the ONE source of tab order: arrow-key navigation reads
 * this array rather than restating it, which is how the two used to drift.
 */
const TABS = ['general', 'notifications', 'personalization', 'apps', 'account'] as const;

type Tab = (typeof TABS)[number];

export default function Settings({ open, onOpenChange }: TDialogProps) {
  const isSmallScreen = useMediaQuery('(max-width: 767px)');
  const localize = useLocalize();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const tabRefs = useRef({});

  const labels: Record<Tab, string> = {
    general: localize('com_nav_setting_general'),
    notifications: localize('com_nav_setting_notifications'),
    personalization: localize('com_nav_setting_personalization'),
    apps: localize('com_nav_setting_apps'),
    account: localize('com_nav_setting_account'),
  };

  const icons: Record<Tab, React.JSX.Element> = {
    general: <GearIcon />,
    notifications: <Bell className="icon-sm" aria-hidden="true" />,
    personalization: <PersonalizationIcon />,
    apps: <Plug className="icon-sm" aria-hidden="true" />,
    account: <UserIcon />,
  };

  const panels: Record<Tab, React.JSX.Element> = {
    general: <General />,
    notifications: <Notifications />,
    personalization: <Personalization />,
    apps: <Apps />,
    account: <Account />,
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const at = TABS.indexOf(activeTab);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveTab(TABS[(at + 1) % TABS.length]);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveTab(TABS[(at - 1 + TABS.length) % TABS.length]);
        break;
      case 'Home':
        event.preventDefault();
        setActiveTab(TABS[0]);
        break;
      case 'End':
        event.preventDefault();
        setActiveTab(TABS[TABS.length - 1]);
        break;
    }
  };

  return (
    <Transition appear show={open}>
      <Dialog as="div" className="relative z-50" onClose={onOpenChange}>
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* The scrim is DECLARED, not painted here. `@hanzo/ui/glass.css` owns
              one dim for every floating panel in the estate, and this dialog was
              hand-rolling a second one — a translucent black under a further
              `opacity`, which is the double dim that sheet exists to end. */}
          <div data-slot="dialog-overlay" className="fixed inset-0" aria-hidden="true" />
        </TransitionChild>

        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className={cn('fixed inset-0 flex w-screen items-center justify-center p-4')}>
            {/* Same idea for the panel: a surface is glass because of what it
                IS, so it says what it is and the sheet paints it. This carried
                `backdrop-blur-2xl` over an OPAQUE `bg-background`, which is a
                blur with nothing to see through — the one combination that
                costs a compositor layer and returns nothing. The slot brings
                the material, the blur and elevation-3 together, so Settings
                stops being the one panel in the app made of a different
                substance than every menu that opens beside it. */}
            <DialogPanel
              data-slot="dialog-content"
              className={cn(
                'max-h-[90vh] overflow-hidden rounded-xl rounded-b-lg pb-6 animate-in sm:rounded-2xl md:w-[680px]',
              )}
            >
              <DialogTitle
                className="mb-1 flex items-center justify-between p-6 pb-5 text-left"
                as="div"
              >
                <h2 className="text-lg font-medium leading-6 text-text-primary">
                  {localize('com_nav_settings')}
                </h2>
                <button
                  type="button"
                  className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-border-xheavy focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-surface-primary dark:focus:ring-offset-surface-primary"
                  onClick={() => onOpenChange(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-text-primary"
                  >
                    <line x1="18" x2="6" y1="6" y2="18"></line>
                    <line x1="6" x2="18" y1="6" y2="18"></line>
                  </svg>
                  <span className="sr-only">{localize('com_ui_close_settings')}</span>
                </button>
              </DialogTitle>
              <div className="max-h-[calc(90vh-120px)] overflow-auto px-6 md:w-[680px]">
                <Tabs
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as Tab)}
                  className="flex flex-col gap-10 md:flex-row"
                  orientation="vertical"
                  flexDirection={isSmallScreen ? 'column' : 'row'}
                  gap={40}
                >
                  {/* TabsList and TabsTrigger paint a pill before they spread,
                      and gui's runtime sheet is appended after the Tailwind
                      sheet, so at equal specificity its values beat the classes
                      below. Each style prop here restates the class it would
                      otherwise silently replace; the ones set to 0/auto undo a
                      value this rail never asked for. flexDirection is the one
                      that cannot be dropped — Group takes it from the tabs
                      orientation, which is vertical, so the phone's flex-row
                      would never land. */}
                  <TabsList
                    aria-label="Settings"
                    className={cn(
                      'min-w-auto max-w-auto relative -ml-[8px] flex flex-shrink-0 flex-col flex-nowrap overflow-auto sm:max-w-none',
                      isSmallScreen
                        ? 'flex-row rounded-xl bg-surface-secondary'
                        : 'sticky top-0 h-full',
                    )}
                    onKeyDown={handleKeyDown}
                    flexDirection={isSmallScreen ? 'row' : 'column'}
                    alignItems="stretch"
                    justifyContent="flex-start"
                    alignSelf="stretch"
                    height={isSmallScreen ? 'auto' : '100%'}
                    padding={0}
                    gap={0}
                    borderRadius={isSmallScreen ? 12 : 0}
                    backgroundColor={isSmallScreen ? 'var(--surface-secondary)' : 'transparent'}
                  >
                    {TABS.map((value) => (
                      <TabsTrigger
                        key={value}
                        className={cn(
                          'group relative z-10 m-1 flex items-center justify-start gap-2 rounded-xl px-2 py-1.5 transition-all duration-200 ease-in-out',
                          isSmallScreen
                            ? 'flex-1 justify-center text-nowrap p-1 px-3 text-sm text-text-secondary radix-state-active:bg-surface-hover radix-state-active:text-text-primary'
                            : 'bg-transparent text-text-secondary radix-state-active:bg-surface-tertiary radix-state-active:text-text-primary',
                        )}
                        value={value}
                        ref={(el) => {
                          tabRefs.current[value] = el;
                        }}
                        flexDirection="row"
                        height="auto"
                        justifyContent={isSmallScreen ? 'center' : 'flex-start'}
                        paddingHorizontal={isSmallScreen ? 12 : 8}
                        gap={8}
                        borderRadius={12}
                        hoverStyle={{}}
                        focusStyle={{}}
                      >
                        {icons[value]}
                        <span>{labels[value]}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="overflow-auto sm:w-full sm:max-w-none md:pr-0.5 md:pt-0.5">
                    {TABS.map((value) => (
                      <TabsContent key={value} value={value} tabIndex={-1}>
                        {panels[value]}
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </div>
            </DialogPanel>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
