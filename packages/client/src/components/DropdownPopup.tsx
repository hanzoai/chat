import React from 'react';
import * as Ariakit from '@ariakit/react';
import type * as t from '~/common';
import { cn } from '~/utils';
import './Dropdown.css';

interface DropdownProps {
  keyPrefix?: string;
  trigger: React.ReactNode;
  items: t.MenuItemProps[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  className?: string;
  iconClassName?: string;
  itemClassName?: string;
  sameWidth?: boolean;
  anchor?: { x: string; y: string };
  /** Which corner the popup hangs from. Ariakit reads this off the STORE, not
   *  off `<Menu>` — passing it to the element is silently ignored. */
  placement?: Ariakit.MenuStoreProps['placement'];
  gutter?: number;
  modal?: boolean;
  portal?: boolean;
  preserveTabOrder?: boolean;
  focusLoop?: boolean;
  menuId: string;
  mountByState?: boolean;
  unmountOnHide?: boolean;
  finalFocus?: React.RefObject<HTMLElement | null>;
  /**
   * Anchors the menu to an arbitrary rect instead of its trigger. This is what
   * makes the SAME menu serve a right-click: the caller returns the pointer
   * position and Ariakit positions against it. Return null to fall back to the
   * trigger, so one menu covers both openings.
   */
  getAnchorRect?: () => { x: number; y: number; width?: number; height?: number } | null;
}

type MenuProps = Omit<
  DropdownProps,
  'trigger' | 'isOpen' | 'setIsOpen' | 'focusLoop' | 'mountByState' | 'placement'
> &
  Ariakit.MenuProps;

const DropdownPopup: React.FC<DropdownProps> = ({
  trigger,
  isOpen,
  setIsOpen,
  focusLoop,
  mountByState,
  placement,
  ...props
}) => {
  const menu = Ariakit.useMenuStore({ open: isOpen, setOpen: setIsOpen, focusLoop, placement });
  if (mountByState) {
    return (
      <Ariakit.MenuProvider store={menu}>
        {trigger}
        {isOpen && <Menu {...props} />}
      </Ariakit.MenuProvider>
    );
  }
  return (
    <Ariakit.MenuProvider store={menu}>
      {trigger}
      <Menu {...props} />
    </Ariakit.MenuProvider>
  );
};

const Menu: React.FC<MenuProps> = ({
  items,
  menuId,
  keyPrefix,
  className,
  iconClassName,
  itemClassName,
  modal,
  portal,
  sameWidth,
  gutter = 8,
  finalFocus,
  unmountOnHide,
  preserveTabOrder,
  getAnchorRect,
  ...props
}) => {
  const menuStore = Ariakit.useMenuStore();
  const menu = Ariakit.useMenuContext();
  return (
    <Ariakit.Menu
      id={menuId}
      modal={modal}
      gutter={gutter}
      portal={portal}
      sameWidth={sameWidth}
      finalFocus={finalFocus}
      unmountOnHide={unmountOnHide}
      preserveTabOrder={preserveTabOrder}
      getAnchorRect={getAnchorRect}
      className={cn('popover-ui glass elevation-2 z-40', className)}
      {...props}
    >
      {items
        .filter((item) => item.show !== false)
        .map((item, index) => {
          const { subItems } = item;
          if (item.separate === true) {
            return <Ariakit.MenuSeparator key={index} className="my-1 h-px border-border-medium" />;
          }
          if (subItems && subItems.length > 0) {
            return (
              <Ariakit.MenuProvider
                store={menuStore}
                key={`${keyPrefix ?? ''}${index}-${item.id ?? ''}-provider`}
              >
                <Ariakit.MenuButton
                  className={cn(
                    'group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-3.5 text-sm text-text-primary outline-none hover:bg-surface-hover focus:bg-surface-hover md:px-2.5 md:py-2',
                    itemClassName,
                  )}
                  disabled={item.disabled}
                  id={item.id}
                  render={item.render}
                  ref={item.ref}
                  // hideOnClick={item.hideOnClick}
                >
                  <span className="flex items-center gap-2">
                    {item.icon != null && (
                      <span className={cn('size-4', iconClassName)} aria-hidden="true">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </span>
                  <Ariakit.MenuButtonArrow className="stroke-1 text-base opacity-75" />
                </Ariakit.MenuButton>
                <Menu
                  items={subItems}
                  menuId={`${menuId}-${index}`}
                  key={`${keyPrefix ?? ''}${index}-${item.id ?? ''}`}
                  gutter={12}
                  portal={true}
                />
              </Ariakit.MenuProvider>
            );
          }

          return (
            <Ariakit.MenuItem
              key={`${keyPrefix ?? ''}${index}-${item.id ?? ''}`}
              id={item.id}
              className={cn(
                'group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-3.5 text-sm text-text-primary outline-none hover:bg-surface-hover focus:bg-surface-hover md:px-2.5 md:py-2',
                itemClassName,
                item.className,
              )}
              disabled={item.disabled}
              render={item.render}
              ref={item.ref}
              hideOnClick={item.hideOnClick}
              aria-haspopup={item.ariaHasPopup}
              aria-controls={item.ariaControls}
              aria-label={item.ariaLabel}
              aria-checked={item.ariaChecked}
              {...(item.ariaChecked !== undefined ? { role: 'menuitemcheckbox' } : {})}
              onClick={(event) => {
                event.preventDefault();
                if (item.onClick) {
                  item.onClick(event);
                }
                if (item.hideOnClick === false) {
                  return;
                }
                menu?.hide();
              }}
            >
              {/* No `mr-2`: the row is already a `gap-2` flex line, so the
                  margin stacked on top of the gap and put 16px between a glyph
                  and its own label — twice the distance the row spends on
                  anything else. One mechanism, and it is the row's. */}
              {item.icon != null && (
                <span className={cn('size-4', iconClassName)} aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
              {/* The whole shortcut, as the caller wrote it. This used to print
                  a hardcoded `⌘` before the value, which cannot express `⌥⌘S`
                  and is wrong on every non-Apple keyboard.
                  `text-text-secondary` was one rung under the label and read as
                  a second label: 205 vs 236 on a near-black surface is a 13%
                  step. `--text-secondary-alt` is the next rung the token layer
                  actually publishes and still clears WCAG AA on this surface —
                  `--text-tertiary`, the rung below it, does not (measured
                  2.8:1). */}
              {item.kbd != null && (
                <kbd className="ml-auto font-sans text-xs text-text-secondary-alt" aria-hidden="true">
                  {item.kbd}
                </kbd>
              )}
            </Ariakit.MenuItem>
          );
        })}
    </Ariakit.Menu>
  );
};

export default DropdownPopup;
