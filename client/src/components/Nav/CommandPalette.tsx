import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrgCommandPalette, type OrgCommandItem } from '@hanzogui/shell';
import { useSetAtom } from 'jotai';
import type { TConversation } from '@hanzochat/data-provider';
import { useAuthContext, useLocalize, useNavigateToConvo } from '~/hooks';
import { useConversationsInfiniteQuery } from '~/data-provider';
import store from '~/store';

/** How many chats the palette offers. A palette is a shortlist, not the archive
    — the whole list is one row away in the sidebar, and eighty titles in a
    scroller is slower to read than typing two more letters. */
const LIMIT = 8;

/**
 * ⌘K, in chat.
 *
 * The palette itself is `@hanzogui/shell`'s — the same frame, matcher, keys and
 * ask row every other Hanzo surface opens — so learning it once is learning it
 * everywhere. This file supplies only the two things the shell cannot know:
 * which app this is, and what chat can do.
 *
 * ONE palette holds the chord. Chat used to mount a second, hand-rolled one
 * beside this (`components/Palette.tsx`), and both bound ⌘K on `document`: two
 * listeners, one chord, so the key opened two overlays stacked on each other and
 * which one you typed into came down to listener order. The shell's own
 * `useCommandKey` says why in one line — "a page that mounted two would have
 * them fight over the same chord". The hand-rolled one is deleted rather than
 * quieted with `stopPropagation`, which would only have hidden the second
 * palette while still mounting it.
 *
 * Its material moved here, because that material was the reason it existed: the
 * recent conversations and Settings are things only chat can contribute. The
 * shell owns the frame; chat owns the commands.
 *
 * The ask row goes to the COMPOSER rather than to hanzo.chat, which is the
 * point of `onAsk`. Every other surface asks by opening chat; chat is already
 * chat, so opening it would be a second copy of the page the reader is on.
 * `/c/new?q=…&submit=true` is the route chat already reads (see AnswerEngine's
 * CHAT_PARAMS), so the question is asked, not merely typed out.
 */
export default function CommandPalette() {
  const navigate = useNavigate();
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext();
  const { navigateToConvo } = useNavigateToConvo();
  const setShowSettings = useSetAtom(store.showSettings);

  /** The params the sidebar passes, so this reads that query's cache instead of
      opening a second one against the same rows. */
  const { data } = useConversationsInfiniteQuery(
    {},
    { enabled: isAuthenticated, staleTime: 30000, cacheTime: 300000 },
  );

  const chats = useMemo<OrgCommandItem[]>(() => {
    const all = (data ? data.pages.flatMap((page) => page.conversations) : []).filter(
      Boolean,
    ) as TConversation[];
    return all.slice(0, LIMIT).map((convo) => ({
      id: `chat-${convo.conversationId}`,
      title: convo.title ?? localize('com_ui_new_chat'),
      category: localize('com_ui_chats'),
      action: () => navigateToConvo(convo),
    }));
  }, [data, localize, navigateToConvo]);

  /* Two groups, both named by a key rather than by a literal. `category` is
     PAINTED — the shell renders it as the group heading and matches queries
     against it — so an English string here would read as English in the other
     forty locales, in the first surface ⌘K opens. Neither label is new:
     `com_ui_go_to` and `com_ui_chats` are the two headings the palette this
     replaces already used for exactly these rows. */
  const commands = useMemo<OrgCommandItem[]>(
    () => [
      {
        id: 'new-chat',
        title: localize('com_ui_new_chat'),
        href: '/c/new',
        category: localize('com_ui_go_to'),
        keywords: ['new', 'conversation', 'start'],
      },
      {
        id: 'settings',
        title: localize('com_nav_settings'),
        category: localize('com_ui_go_to'),
        keywords: ['settings', 'preferences', 'model'],
        action: () => setShowSettings(true),
      },
      ...chats,
    ],
    [chats, localize, setShowSettings],
  );

  const ask = useCallback(
    (question: string) => {
      // `submit=true` is what makes this an ASK rather than a draft — without
      // it the palette would hand back a composer the reader has to press
      // enter in a second time, having already pressed it once.
      navigate(`/c/new?q=${encodeURIComponent(question)}&submit=true`);
    },
    [navigate],
  );

  /* Relative hrefs stay inside the SPA — a full page load here would throw away
     the session's warm state to move one route. The shell's default sends
     externals to a new tab, which is what an app switch should do. */
  const go = useCallback(
    (href: string, external?: boolean) => {
      if (external) window.open(href, '_blank', 'noreferrer');
      else navigate(href);
    },
    [navigate],
  );

  return (
    <OrgCommandPalette commands={commands} currentAppId="chat" onAsk={ask} onNavigate={go} />
  );
}
