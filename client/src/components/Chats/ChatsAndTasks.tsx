import { useState, useMemo, useCallback, useRef, useId, memo } from 'react';
import * as Ariakit from '@ariakit/react';
import { useNavigate } from 'react-router-dom';
import { Search, Pin, ListFilter, Plus, Archive, Check } from 'lucide-react';
import { Button, DropdownPopup, Spinner } from '@hanzochat/client';
import type { TConversation } from '@hanzochat/data-provider';
import type * as t from '~/common';
import { useConversationsInfiniteQuery, useArchiveConvoMutation } from '~/data-provider';
import {
  useLocalize,
  useNavigateToConvo,
  useNewConvo,
  useConvoPin,
  useConvoRename,
  useAuthContext,
} from '~/hooks';
import RenameForm from '~/components/Conversations/RenameForm';
import { ConvoOptions } from '~/components/Conversations';
import { groupConversationsByDate } from '~/utils';
import type { TranslationKeys } from '~/hooks';
import './chats.css';

type Filter = 'all' | 'pinned';

/**
 * One row. It reuses `ConvoOptions` — the same menu the sidebar opens — so a
 * conversation has exactly one set of verbs no matter which surface you reach
 * it from, and right-click works here for the same reason it works there.
 */
const ChatRow = memo(function ChatRow({
  convo,
  selecting,
  selected,
  onToggleSelect,
  refetch,
}: {
  convo: TConversation;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  refetch: () => void;
}) {
  const localize = useLocalize();
  const { navigateToConvo } = useNavigateToConvo();
  const [menuOpen, setMenuOpen] = useState(false);
  const contextPointRef = useRef<{ x: number; y: number } | null>(null);
  const { titleInput, setTitleInput, renaming, startRename, cancelRename, submitRename } =
    useConvoRename(convo.conversationId, convo.title);

  const title = convo.title ?? localize('com_ui_untitled');
  const conversationId = convo.conversationId ?? '';

  const handleRename = useCallback(() => {
    setMenuOpen(false);
    startRename();
  }, [startRename]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    contextPointRef.current = { x: e.clientX, y: e.clientY };
    setMenuOpen(true);
  }, []);

  const handleMenuOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open);
    if (!open) {
      contextPointRef.current = null;
    }
  }, []);

  const getAnchorRect = useCallback(() => contextPointRef.current, []);

  const activate = useCallback(() => {
    if (renaming) {
      return;
    }
    if (selecting) {
      onToggleSelect(conversationId);
      return;
    }
    navigateToConvo(convo);
  }, [renaming, selecting, onToggleSelect, conversationId, navigateToConvo, convo]);

  return (
    <div
      role="button"
      tabIndex={renaming ? -1 : 0}
      // `group` is not styling — it is ConvoOptions' contract. Its kebab reveals
      // itself with `group-hover:opacity-100`, which resolves only against an
      // ancestor carrying that marker, so without it the button is invisible.
      className="chats-pane__row group"
      data-open={menuOpen ? 'true' : 'false'}
      data-testid="chats-pane-row"
      aria-label={localize('com_ui_conversation_label', { title })}
      onClick={activate}
      onContextMenu={renaming ? undefined : handleContextMenu}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
    >
      {selecting && (
        /* A native input, not `@hanzochat/client`'s Checkbox: that one is an
           @hanzo/ui primitive backed by @hanzo/gui, and this tree resolves TWO
           gui copies (root 8.1.0, packages/client 8.0.1), so it renders against
           a different context than App.jsx's GuiProvider and throws "Can't find
           Gui configuration". Swap it back once the copies are deduped. */
        <input
          type="checkbox"
          checked={selected}
          className="chats-pane__check"
          aria-label={localize('com_ui_select')}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(conversationId)}
        />
      )}
      {renaming ? (
        <RenameForm
          titleInput={titleInput}
          setTitleInput={setTitleInput}
          onSubmit={submitRename}
          onCancel={cancelRename}
          localize={localize}
        />
      ) : (
        <span className="chats-pane__row-title">{title}</span>
      )}
      {convo.isPinned === true && (
        <span className="chats-pane__row-pin" aria-label={localize('com_ui_pinned')}>
          <Pin size={14} aria-hidden={true} />
        </span>
      )}
      <span className="chats-pane__row-date">
        {convo.updatedAt ? new Date(convo.updatedAt).toLocaleDateString() : ''}
      </span>
      <span className="chats-pane__row-menu" onClick={(e) => e.stopPropagation()}>
        <ConvoOptions
          title={convo.title}
          tags={convo.tags}
          isPinned={convo.isPinned === true}
          conversationId={convo.conversationId}
          retainView={refetch}
          renameHandler={handleRename}
          isPopoverActive={menuOpen}
          setIsPopoverActive={handleMenuOpenChange}
          isActiveConvo={menuOpen}
          getAnchorRect={getAnchorRect}
        />
      </span>
    </div>
  );
});

/**
 * The "Chats and tasks" pane: the whole conversation list as a first-class
 * screen rather than a strip in the sidebar — search, a filter, a multi-select
 * mode with real bulk verbs, and New.
 */
export default function ChatsAndTasks() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const filterMenuId = useId();
  const { isAuthenticated } = useAuthContext();
  const { newConversation } = useNewConvo();
  const { setPinned, isPinning } = useConvoPin();
  const archiveMutation = useArchiveConvoMutation();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useConversationsInfiniteQuery(
    {},
    { enabled: isAuthenticated, staleTime: 30000, cacheTime: 300000 },
  );

  const conversations = useMemo(
    () => (data ? data.pages.flatMap((page) => page.conversations) : []).filter(Boolean),
    [data],
  ) as TConversation[];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations.filter((convo) => {
      if (filter === 'pinned' && convo.isPinned !== true) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (convo.title ?? '').toLowerCase().includes(needle);
    });
  }, [conversations, query, filter]);

  /** Pinned first, then the same date grouping the sidebar uses. */
  const sections = useMemo(() => {
    const pinned = visible.filter((c) => c.isPinned === true);
    const rest = groupConversationsByDate(visible.filter((c) => c.isPinned !== true));
    const out: Array<[string, TConversation[]]> = [];
    if (pinned.length > 0) {
      out.push(['com_ui_pinned', pinned]);
    }
    return out.concat(rest as Array<[string, TConversation[]]>);
  }, [visible]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const exitSelect = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  const selectedConvos = useMemo(
    () => visible.filter((c) => selected.has(c.conversationId ?? '')),
    [visible, selected],
  );

  const allSelectedPinned =
    selectedConvos.length > 0 && selectedConvos.every((c) => c.isPinned === true);

  const bulkPin = useCallback(async () => {
    for (const convo of selectedConvos) {
      await setPinned(convo.conversationId, !allSelectedPinned);
    }
    exitSelect();
  }, [selectedConvos, setPinned, allSelectedPinned, exitSelect]);

  const bulkArchive = useCallback(async () => {
    for (const convo of selectedConvos) {
      await archiveMutation.mutateAsync({
        conversationId: convo.conversationId ?? '',
        isArchived: true,
      });
    }
    exitSelect();
  }, [selectedConvos, archiveMutation, exitSelect]);

  const handleNew = useCallback(() => {
    newConversation();
    navigate('/c/new', { state: { focusChat: true } });
  }, [newConversation, navigate]);

  const filterItems: t.MenuItemProps[] = useMemo(
    () => [
      {
        label: localize('com_ui_filter_reset'),
        ariaChecked: filter === 'all',
        onClick: () => setFilter('all'),
        icon:
          filter === 'all' ? (
            <Check className="icon-sm mr-2 text-text-primary" aria-hidden={true} />
          ) : (
            <span className="icon-sm mr-2" aria-hidden={true} />
          ),
      },
      {
        label: localize('com_ui_pinned'),
        ariaChecked: filter === 'pinned',
        onClick: () => setFilter('pinned'),
        icon:
          filter === 'pinned' ? (
            <Check className="icon-sm mr-2 text-text-primary" aria-hidden={true} />
          ) : (
            <span className="icon-sm mr-2" aria-hidden={true} />
          ),
      },
    ],
    [filter, localize],
  );

  return (
    <div className="chats-pane" data-testid="chats-pane">
      <div className="chats-pane__head">
        <div className="chats-pane__titlerow">
          <h1 className="chats-pane__title">{localize('com_ui_chats_and_tasks')}</h1>
          <div className="chats-pane__actions">
            <Button
              variant="outline"
              size="sm"
              data-testid="chats-pane-select"
              aria-pressed={selecting}
              onClick={() => (selecting ? exitSelect() : setSelecting(true))}
            >
              {selecting ? localize('com_ui_done') : localize('com_ui_select')}
            </Button>
            <Button variant="default" size="sm" data-testid="chats-pane-new" onClick={handleNew}>
              <Plus className="icon-sm" aria-hidden={true} />
              {localize('com_ui_new_chat')}
            </Button>
          </div>
        </div>

        <div className="chats-pane__controls">
          <div className="chats-pane__search">
            <Search size={16} className="chats-pane__search-icon" aria-hidden={true} />
            <input
              type="search"
              value={query}
              data-testid="chats-pane-search"
              aria-label={localize('com_ui_chats_search')}
              placeholder={localize('com_ui_chats_search')}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <DropdownPopup
            portal={true}
            menuId={filterMenuId}
            isOpen={filterOpen}
            setIsOpen={setFilterOpen}
            items={filterItems}
            trigger={
              /* Ariakit.MenuButton, not a bare Button: DropdownPopup's store
                 takes both the open toggle and the anchor from the trigger. */
              <Ariakit.MenuButton
                render={<Button variant="outline" size="sm" />}
                data-testid="chats-pane-filter"
                aria-label={localize('com_ui_filter_reset')}
              >
                <ListFilter className="icon-sm" aria-hidden={true} />
                {filter === 'pinned' ? localize('com_ui_pinned') : localize('com_ui_filter_reset')}
              </Ariakit.MenuButton>
            }
          />
        </div>

        {selecting && (
          <div className="chats-pane__selbar">
            <span className="chats-pane__selcount" data-testid="chats-pane-selcount">
              {localize('com_ui_selected_count', { count: selected.size })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={selected.size === 0 || isPinning}
              onClick={bulkPin}
            >
              <Pin className="icon-sm" aria-hidden={true} />
              {allSelectedPinned ? localize('com_ui_unpin') : localize('com_ui_pin')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selected.size === 0 || archiveMutation.isLoading}
              onClick={bulkArchive}
            >
              <Archive className="icon-sm" aria-hidden={true} />
              {localize('com_ui_archive')}
            </Button>
          </div>
        )}
      </div>

      <div className="chats-pane__list">
        {isLoading && (
          <div className="chats-pane__empty">
            <Spinner className="text-text-primary" />
          </div>
        )}
        {!isLoading && visible.length === 0 && (
          <div className="chats-pane__empty">{localize('com_ui_nothing_found')}</div>
        )}
        {sections.map(([groupName, convos]) => (
          <div key={groupName}>
            <div className="chats-pane__group">
              {localize(groupName as TranslationKeys) || groupName}
            </div>
            {convos.map((convo) => (
              <ChatRow
                key={convo.conversationId}
                convo={convo}
                refetch={refetch}
                selecting={selecting}
                selected={selected.has(convo.conversationId ?? '')}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
