import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  memo,
  lazy,
  Suspense,
  useRef,
  startTransition,
} from 'react';
import { useAtomValue } from 'jotai';
import { Skeleton, useMediaQuery } from '@hanzochat/client';
import { PermissionTypes, Permissions } from '@hanzochat/data-provider';
import type { InfiniteQueryObserverResult } from '@tanstack/react-query';
import type { ConversationListResponse } from '@hanzochat/data-provider';
import type { List } from 'react-virtualized';
import {
  useLocalize,
  useHasAccess,
  useAuthContext,
  useLocalStorage,
  useNavScrolling,
} from '~/hooks';
import { useConversationsInfiniteQuery, useTitleGeneration } from '~/data-provider';
import { Conversations } from '~/components/Conversations';
import SearchBar from './SearchBar';
import Signature from './Signature';
import NewChat from './NewChat';
import Rail from './Rail';
import { cn } from '~/utils';
import store from '~/store';

const BookmarkNav = lazy(() => import('./Bookmarks/BookmarkNav'));
const AccountSettings = lazy(() => import('./AccountSettings'));
const Visitor = lazy(() => import('./Visitor'));

export const NAV_WIDTH = {
  MOBILE: 320,
  DESKTOP: 260,
  /** The collapsed rail — icon-only, and still on screen. */
  RAIL: 56,
} as const;

const SearchBarSkeleton = memo(() => (
  <div className={cn('flex h-10 items-center py-2')}>
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
));

SearchBarSkeleton.displayName = 'SearchBarSkeleton';

const NavMask = memo(
  ({ navVisible, toggleNavVisible }: { navVisible: boolean; toggleNavVisible: () => void }) => (
    <div
      id="mobile-nav-mask-toggle"
      role="button"
      tabIndex={0}
      className={`nav-mask transition-opacity duration-200 ease-in-out ${navVisible ? 'active opacity-100' : 'opacity-0'}`}
      onClick={toggleNavVisible}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          toggleNavVisible();
        }
      }}
      aria-label="Toggle navigation"
    />
  ),
);

const MemoNewChat = memo(NewChat);

const Nav = memo(
  ({
    navVisible,
    setNavVisible,
  }: {
    navVisible: boolean;
    setNavVisible: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
    const localize = useLocalize();
    const { isAuthenticated } = useAuthContext();
    useTitleGeneration(isAuthenticated);

    const isSmallScreen = useMediaQuery('(max-width: 768px)');
    /**
     * Collapsed, the sidebar is a narrow RAIL that stays on screen — the model
     * `hanzo.app` and the console share — not a panel translated off it. The
     * column keeps its stack, which is why compose sits BELOW the mark there.
     * Below md there is no rail: the sidebar is a drawer and collapse is a
     * desktop affordance.
     */
    const collapsed = !isSmallScreen && !navVisible;
    const [newUser, setNewUser] = useLocalStorage('newUser', true);
    const [isChatsExpanded, setIsChatsExpanded] = useLocalStorage('chatsExpanded', true);
    const [showLoading, setShowLoading] = useState(false);
    const [tags, setTags] = useState<string[]>([]);

    const hasAccessToBookmarks = useHasAccess({
      permissionType: PermissionTypes.BOOKMARKS,
      permission: Permissions.USE,
    });

    const search = useAtomValue(store.search);

    const { data, fetchNextPage, isFetchingNextPage, isLoading, isFetching, refetch } =
      useConversationsInfiniteQuery(
        {
          tags: tags.length === 0 ? undefined : tags,
          search: search.debouncedQuery || undefined,
        },
        {
          enabled: isAuthenticated,
          staleTime: 30000,
          cacheTime: 300000,
        },
      );

    const computedHasNextPage = useMemo(() => {
      if (data?.pages && data.pages.length > 0) {
        const lastPage: ConversationListResponse = data.pages[data.pages.length - 1];
        return lastPage.nextCursor !== null;
      }
      return false;
    }, [data?.pages]);

    const outerContainerRef = useRef<HTMLDivElement>(null);
    const conversationsRef = useRef<List | null>(null);

    const { moveToTop } = useNavScrolling<ConversationListResponse>({
      setShowLoading,
      fetchNextPage: async (options?) => {
        if (computedHasNextPage) {
          return fetchNextPage(options);
        }
        return Promise.resolve(
          {} as InfiniteQueryObserverResult<ConversationListResponse, unknown>,
        );
      },
      isFetchingNext: isFetchingNextPage,
    });

    const conversations = useMemo(() => {
      return data ? data.pages.flatMap((page) => page.conversations) : [];
    }, [data]);

    const toggleNavVisible = useCallback(() => {
      // Use startTransition to mark this as a non-urgent update
      // This prevents blocking the main thread during the cascade of re-renders
      startTransition(() => {
        setNavVisible((prev: boolean) => {
          localStorage.setItem('navVisible', JSON.stringify(!prev));
          return !prev;
        });
        if (newUser) {
          setNewUser(false);
        }
      });
    }, [newUser, setNavVisible, setNewUser]);

    const itemToggleNav = useCallback(() => {
      if (isSmallScreen) {
        toggleNavVisible();
      }
    }, [isSmallScreen, toggleNavVisible]);

    // No auto-toggle effect here: the first-visit default (closed on a phone,
    // open on desktop) is Root's initial state. An effect correcting it after
    // mount raced its own localStorage write — its guard read `null`, re-ran
    // when `toggleNavVisible`'s identity changed, and toggled the drawer back
    // open before the first write committed.

    useEffect(() => {
      refetch();
    }, [tags, refetch]);

    const loadMoreConversations = useCallback(() => {
      if (isFetchingNextPage || !computedHasNextPage) {
        return;
      }

      fetchNextPage();
    }, [isFetchingNextPage, computedHasNextPage, fetchNextPage]);

    /**
     * The destination rows (Rail), then search and the tag filter on one row
     * above the list they both filter.
     *
     * The tag filter used to sit in the icon strip, between the app switcher and
     * the compose button, where it read as app chrome rather than as a control
     * for the conversations underneath it. It cannot join the other bookmark
     * control at the top right of the view: that one tags the OPEN conversation,
     * this one filters THIS list, and its selection is this component's state —
     * two bookmark buttons in one corner would be the duplication, not the fix.
     */
    const subHeaders = useMemo(() => {
      const searching = search.enabled === null || search.enabled === true;
      return (
        <>
          {/* Search sits directly under the mark — a filter for everything below
              it, reachable with ⌘/Ctrl-K — the shape hanzo.app uses. It leads;
              the destinations follow. */}
          {!collapsed && (searching || hasAccessToBookmarks) && (
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                {search.enabled === null && <SearchBarSkeleton />}
                {search.enabled === true && <SearchBar isSmallScreen={isSmallScreen} />}
              </div>
              {hasAccessToBookmarks && (
                <Suspense fallback={null}>
                  <BookmarkNav tags={tags} setTags={setTags} />
                </Suspense>
              )}
            </div>
          )}
          <Rail toggleNav={itemToggleNav} collapsed={collapsed} />
        </>
      );
    }, [search.enabled, isSmallScreen, hasAccessToBookmarks, tags, itemToggleNav, collapsed]);

    // ⌘/Ctrl-K focuses the sidebar search — the palette shortcut, without a
    // palette: search already filters the list live, so the key just puts the
    // cursor in it. Ignored while typing in another field so it never steals a
    // keystroke meant for the composer.
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          const el = document.getElementById('nav-search-input');
          if (el) {
            e.preventDefault();
            (el as HTMLInputElement).focus();
          }
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, []);

    const [isSearchLoading, setIsSearchLoading] = useState(
      !!search.query && (search.isTyping || isLoading || isFetching),
    );

    useEffect(() => {
      if (search.isTyping) {
        setIsSearchLoading(true);
      } else if (!isLoading && !isFetching) {
        setIsSearchLoading(false);
      } else if (!!search.query && (isLoading || isFetching)) {
        setIsSearchLoading(true);
      }
    }, [search.query, search.isTyping, isLoading, isFetching]);

    // Always render sidebar to avoid mount/unmount costs
    const sidebarWidth = isSmallScreen ? NAV_WIDTH.MOBILE : NAV_WIDTH.DESKTOP;

    // One content tree, two widths. Collapsed it keeps the head (mark, compose)
    // and the destinations, and drops what a 56px column cannot say: the list,
    // the search row, and the account foot — every one of them one click away
    // behind the mark.
    const sidebarContent = (
      <div className="flex h-full flex-col">
        <nav
          id="chat-history-nav"
          aria-label={localize('com_ui_chat_history')}
          className="flex h-full flex-col px-2 pb-3.5"
          aria-hidden={isSmallScreen && !navVisible}
        >
          <div className="flex flex-1 flex-col overflow-hidden" ref={outerContainerRef}>
            <MemoNewChat
              subHeaders={subHeaders}
              toggleNav={toggleNavVisible}
              isSmallScreen={isSmallScreen}
              collapsed={collapsed}
            />
            {/* The chat-history list is for someone who HAS history. A
                signed-out visitor never fetches any (the query is gated on the
                session), so for them with nothing yet it is an empty "Chats"
                header framing a void — the sidebar should just be New + the
                sign-up offer. Show the list once there is a session, or the
                moment a guest turn actually produces a conversation.

                And never in the rail: 56px of column cannot hold a title. */}
            {!collapsed && conversations.length > 0 && (
              <div className="flex min-h-0 flex-grow flex-col overflow-hidden">
                <Conversations
                  conversations={conversations}
                  moveToTop={moveToTop}
                  toggleNav={itemToggleNav}
                  containerRef={conversationsRef}
                  loadMoreConversations={loadMoreConversations}
                  isLoading={isFetchingNextPage || showLoading || isLoading}
                  isSearchLoading={isSearchLoading}
                  isChatsExpanded={isChatsExpanded}
                  setIsChatsExpanded={setIsChatsExpanded}
                />
              </div>
            )}
          </div>
          {/* One foot, two states. The account block belongs to a session; the
              visitor block belongs to everyone else, and they are exclusive so
              the corner never shows an account menu with no account behind it. */}
          {!collapsed && (
            <>
              <Suspense fallback={<Skeleton className="mt-1 h-12 w-full rounded-xl" />}>
                {isAuthenticated ? <AccountSettings /> : <Visitor />}
              </Suspense>
              <Signature />
            </>
          )}
        </nav>
      </div>
    );

    // Mobile: Fixed positioned sidebar that slides over content
    // Uses CSS transitions (not Framer Motion) to sync perfectly with content animation
    if (isSmallScreen) {
      return (
        <>
          <div
            data-testid="nav"
            className={cn(
              'nav fixed left-0 top-0 z-[110] h-full glass bg-surface-primary-alt',
              navVisible && 'active',
            )}
            style={{
              width: sidebarWidth,
              transform: navVisible ? 'translateX(0)' : `translateX(-${sidebarWidth}px)`,
              transition: 'transform 0.2s ease-out',
            }}
          >
            {sidebarContent}
          </div>
          <NavMask navVisible={navVisible} toggleNavVisible={toggleNavVisible} />
        </>
      );
    }

    // Desktop: the sidebar is ALWAYS on screen — the full column, or the rail.
    // Only its width moves. `active` is unconditional here because it is what
    // `.nav` reads as "in flow and visible" (mobile.css); the state that used
    // to drop it was the state that translated the whole panel away.
    const width = navVisible ? sidebarWidth : NAV_WIDTH.RAIL;
    return (
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ width, transition: 'width 0.2s ease-out' }}
      >
        <div
          data-testid="nav"
          className="nav active h-full glass bg-surface-primary-alt"
          style={{ width }}
        >
          {sidebarContent}
        </div>
      </div>
    );
  },
);

Nav.displayName = 'Nav';

export default Nav;
