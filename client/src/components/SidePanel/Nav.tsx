import { useId } from 'react';
import {
  AccordionContent,
  AccordionItem,
  TooltipAnchor,
  Accordion,
  Button,
} from '@hanzochat/client';
import type { NavLink, NavProps } from '~/common';
import { ActivePanelProvider, useActivePanel } from '~/Providers';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

function NavContent({ links, isCollapsed, resize }: Omit<NavProps, 'defaultActive'>) {
  const localize = useLocalize();
  const { active, setActive } = useActivePanel();
  const getVariant = (link: NavLink) => (link.id === active ? 'default' : 'ghost');
  /* One accordion per link, so each button and its panel have to name each
     other themselves. The accordion's own ids for that pair are reachable only
     from a Trigger, and a Trigger renders its own button — which would drop the
     `Button` this row is drawn with. `link.id` is unique within a Nav and the
     prefix keeps two Navs on one page apart. */
  const uid = useId();

  return (
    /* `h-full` is what makes the fill a SURFACE. Without it this div sized to
       its icons — 160px — while the panel under it is `bg-background`, so the
       collapsed rail painted a near-black cap on a lighter column with a hard
       seam between them, and the left sidebar (the same
       `surface-primary-alt`, full height) had no twin on the right. Every
       descendant already asks for `h-full`; none of them could resolve it,
       because this element never had a height to resolve against. */
    <div
      data-collapsed={isCollapsed}
      className="glass bg-surface-primary-alt hide-scrollbar group h-full flex-shrink-0 overflow-x-hidden"
    >
      <div className="h-full">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-full min-h-0 flex-col opacity-100 transition-opacity">
            <div className="scrollbar-trigger relative h-full w-full flex-1 items-start border-white/20">
              {/* `justify-center` sat here too, and giving the parent a height
                  above would have switched it on for the first time — dropping
                  the collapsed rail's icons into the middle of a 900px column.
                  It has never once taken effect, so it is not a behaviour being
                  removed; it is dormant intent that would have shipped as a
                  regression the moment the layout above started working.
                  `items-center` is the cross axis and does centre the icons in
                  the 49px rail, which is wanted, so it stays. */}
              <div className="flex h-full w-full flex-col gap-1 px-3 py-2.5 group-[[data-collapsed=true]]:items-center group-[[data-collapsed=true]]:px-2">
                {links.map((link, index) => {
                  const variant = getVariant(link);
                  const isOpen = active === link.id;
                  const triggerId = `${uid}-${link.id}-trigger`;
                  const contentId = `${uid}-${link.id}-content`;
                  return isCollapsed ? (
                    <TooltipAnchor
                      description={localize(link.title)}
                      side="left"
                      key={`nav-link-${index}`}
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            if (link.onClick) {
                              link.onClick(e);
                              setActive('');
                              return;
                            }
                            setActive(link.id);
                            resize && resize(25);
                          }}
                        >
                          <link.icon className="h-4 w-4 text-text-secondary" />
                          <span className="sr-only">{localize(link.title)}</span>
                        </Button>
                      }
                    />
                  ) : (
                    <Accordion
                      key={index}
                      type="single"
                      value={active}
                      onValueChange={setActive}
                      collapsible
                    >
                      <AccordionItem value={link.id} className="w-full border-none">
                        <Button
                          variant="outline"
                          size="sm"
                          id={triggerId}
                          aria-expanded={isOpen}
                          aria-controls={contentId}
                          className={cn(
                            'w-full justify-start bg-transparent text-text-secondary',
                            isOpen && 'bg-surface-secondary text-text-primary',
                          )}
                          onClick={(e) => {
                            link.onClick?.(e);
                            setActive(isOpen ? '' : link.id);
                          }}
                        >
                          <link.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                          {localize(link.title)}
                          {link.label != null && link.label && (
                            <span
                              className={cn(
                                'ml-auto opacity-100 transition-all duration-300 ease-in-out',
                                variant === 'default' ? 'text-text-primary' : '',
                              )}
                            >
                              {link.label}
                            </span>
                          )}
                        </Button>

                        <AccordionContent
                          id={contentId}
                          aria-labelledby={triggerId}
                          className="bg-surface-primary-alt w-full text-text-primary"
                        >
                          {link.Component && <link.Component />}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Nav({ links, isCollapsed, resize, defaultActive }: NavProps) {
  return (
    <ActivePanelProvider defaultActive={defaultActive}>
      <NavContent links={links} isCollapsed={isCollapsed} resize={resize} />
    </ActivePanelProvider>
  );
}
