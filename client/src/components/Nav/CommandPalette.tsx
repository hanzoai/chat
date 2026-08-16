import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrgCommandPalette, type OrgCommandItem } from '@hanzogui/shell';
import { useLocalize } from '~/hooks';

/**
 * ⌘K, in chat.
 *
 * The palette itself is `@hanzogui/shell`'s — the same frame, matcher, keys and
 * ask row every other Hanzo surface opens — so learning it once is learning it
 * everywhere. This file supplies only the two things the shell cannot know:
 * which app this is, and what chat can do.
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

  const commands: OrgCommandItem[] = useMemo(
    () => [
      {
        id: 'new-chat',
        title: localize('com_ui_new_chat'),
        href: '/c/new',
        category: 'Chat',
        keywords: ['new', 'conversation', 'start'],
      },
    ],
    [localize],
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
