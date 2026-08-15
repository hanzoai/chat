import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Settings, SquarePen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TConversation } from '@hanzochat/data-provider';
import type { TranslationKeys } from '~/hooks/useLocalize';
import { useAuthContext, useLocalize, useNavigateToConvo } from '~/hooks';
import { useConversationsInfiniteQuery } from '~/data-provider';
import { PLACES } from '~/components/Nav/Rail';
import { ROW } from '~/components/chrome';
import { cn } from '~/utils';
import store from '~/store';

/** How many chats a search may show. A palette is a shortlist, not the archive —
    the whole list is one row away at Chats, and eighty titles in a scroller is
    slower to read than typing two more letters. */
const LIMIT = 8;

type Place = {
  key: string;
  label: TranslationKeys;
  Icon: LucideIcon;
  go: () => void;
};

/**
 * ⌘K — search your chats and jump anywhere, from any screen.
 *
 * The material is not written here. The panel carries `data-slot="dialog-content"`
 * and the backdrop `data-slot="dialog-overlay"`, which is how every other dialog
 * in the app asks `@hanzo/ui/glass.css` for its ground, blur, rung 3 of the
 * elevation ladder and the scrim. Restating those values would be a second copy
 * that drifts the day design moves the theme — that sheet says so itself.
 *
 * Rows wear `ROW`, the same box the sidebar's list wears, so a conversation reads
 * the same whichever list you found it in, and its 48px floor is what makes the
 * palette work under a thumb. Pointer and keyboard light a row with one token
 * (`surface-active-alt`), so hovering and arrowing look alike.
 *
 * The combobox is INLINE, not a popover: the dialog already floats, and a second
 * floating layer anchored inside it is what makes hand-rolled palettes feel
 * loose. Its `open` is pinned true because visibility is the dialog's to decide.
 */
export default function Palette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const localize = useLocalize();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const { navigateToConvo } = useNavigateToConvo();
  const setShowSettings = useSetAtom(store.showSettings);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  // ⌘K everywhere, including from inside a field. Taking the key back from
  // whatever has focus is the whole contract of the shortcut — every palette on
  // every platform does it — which is why this one does not step aside the way a
  // bare letter would have to.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuery('');
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /** The params the sidebar passes, so this reads that query's cache instead of
      opening a second one against the same rows. */
  const { data } = useConversationsInfiniteQuery(
    {},
    { enabled: isAuthenticated && open, staleTime: 30000, cacheTime: 300000 },
  );

  const run = useCallback(
    (act: () => void) => {
      close();
      act();
    },
    [close],
  );

  const places = useMemo<Place[]>(
    () => [
      { key: 'new', label: 'com_ui_new_chat', Icon: SquarePen, go: () => navigate('/c/new') },
      ...PLACES.map(({ path, label, Icon }) => ({
        key: path,
        label,
        Icon,
        go: () => navigate(path),
      })),
      {
        key: 'settings',
        label: 'com_nav_settings',
        Icon: Settings,
        go: () => setShowSettings(true),
      },
    ],
    [navigate, setShowSettings],
  );

  const needle = query.trim().toLowerCase();

  const chats = useMemo(() => {
    const all = (data ? data.pages.flatMap((page) => page.conversations) : []).filter(
      Boolean,
    ) as TConversation[];
    return all
      .filter((convo) => !needle || (convo.title ?? '').toLowerCase().includes(needle))
      .slice(0, LIMIT);
  }, [data, needle]);

  const destinations = useMemo(
    () => places.filter((place) => !needle || localize(place.label).toLowerCase().includes(needle)),
    [places, needle, localize],
  );

  const rowClass = cn(ROW, 'cursor-pointer data-[active-item]:bg-surface-active-alt');
  const groupLabelClass = 'px-2 py-1 text-xs font-medium text-text-secondary';

  return (
    <Ariakit.Dialog
      open={open}
      onClose={close}
      unmountOnHide
      data-slot="dialog-content"
      aria-label={localize('com_ui_palette')}
      // 130/140 is the rung a top-level dialog stands on here — OriginalDialog
      // computes exactly those for depth 1, and standing anywhere else would put
      // the palette under the sidebar's own row menus (125) or over the tooltips
      // (150) that are supposed to clear it.
      backdrop={<div data-slot="dialog-overlay" className="fixed inset-0 z-[130]" />}
      className={cn(
        'fixed left-1/2 top-4 z-[140] -translate-x-1/2 md:top-[12vh]',
        'flex max-h-[80vh] w-[calc(100vw-2rem)] max-w-lg flex-col overflow-hidden md:max-h-[60vh]',
        'rounded-xl border border-border-light text-text-primary outline-none',
      )}
    >
      <Ariakit.ComboboxProvider open value={query} setValue={setQuery} includesBaseElement={false}>
        <div className="flex items-center gap-3 border-b border-border-light px-4">
          <Search className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          {/* `text-base` below md keeps iOS from zooming the page on focus. */}
          <Ariakit.Combobox
            autoSelect
            placeholder={localize('com_ui_palette')}
            className="w-full border-none bg-transparent py-3.5 text-base placeholder-text-secondary focus:outline-none md:text-sm"
          />
        </div>
        <Ariakit.ComboboxList className="flex flex-col gap-0.5 overflow-y-auto p-2">
          {chats.length === 0 && destinations.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-text-secondary">
              {localize('com_ui_no_results_found')}
            </div>
          )}
          {chats.length > 0 && (
            <Ariakit.ComboboxGroup>
              <Ariakit.ComboboxGroupLabel className={groupLabelClass}>
                {localize('com_ui_chats')}
              </Ariakit.ComboboxGroupLabel>
              {chats.map((convo) => (
                <Ariakit.ComboboxItem
                  key={convo.conversationId}
                  focusOnHover
                  setValueOnClick={false}
                  className={rowClass}
                  onClick={() => run(() => navigateToConvo(convo))}
                >
                  <MessageSquare className="shrink-0 text-text-secondary" aria-hidden="true" />
                  <span className="truncate">{convo.title}</span>
                </Ariakit.ComboboxItem>
              ))}
            </Ariakit.ComboboxGroup>
          )}
          {destinations.length > 0 && (
            <Ariakit.ComboboxGroup>
              <Ariakit.ComboboxGroupLabel className={groupLabelClass}>
                {localize('com_ui_go_to')}
              </Ariakit.ComboboxGroupLabel>
              {destinations.map(({ key, label, Icon, go }) => (
                <Ariakit.ComboboxItem
                  key={key}
                  focusOnHover
                  setValueOnClick={false}
                  className={rowClass}
                  onClick={() => run(go)}
                >
                  <Icon className="shrink-0 text-text-secondary" aria-hidden="true" />
                  <span className="truncate">{localize(label)}</span>
                </Ariakit.ComboboxItem>
              ))}
            </Ariakit.ComboboxGroup>
          )}
        </Ariakit.ComboboxList>
      </Ariakit.ComboboxProvider>
    </Ariakit.Dialog>
  );
}
