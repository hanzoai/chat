import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { TAttachment } from '@hanzochat/data-provider';
import { atomWithLocalStorage } from './utils';

const hideBannerHint = atomWithLocalStorage('hideBannerHint', [] as string[]);

const messageAttachmentsMap = atom<Record<string, TAttachment[] | undefined>>({});

/**
 * Selector to get attachments for a specific conversation.
 */
const conversationAttachmentsSelector = atomFamily((conversationId: string | undefined) =>
  atom((get): Record<string, TAttachment[]> => {
    if (!conversationId) {
      return {};
    }

    const attachmentsMap = get(messageAttachmentsMap);
    const result: Record<string, TAttachment[]> = {};

    // Filter to only include attachments for this conversation
    Object.entries(attachmentsMap).forEach(([messageId, attachments]) => {
      if (!attachments || attachments.length === 0) {
        return;
      }

      const relevantAttachments = attachments.filter(
        (attachment) => attachment.conversationId === conversationId,
      );

      if (relevantAttachments.length > 0) {
        result[messageId] = relevantAttachments;
      }
    });

    return result;
  }),
);

const queriesEnabled = atom<boolean>(true);

/**
 * Whether this visitor holds a real signed-in session. A GUEST does not: it has a
 * token and a user object, but the member-only routes refuse its bearer. Mirrored
 * here by AuthContext so a query hook can gate on it without importing the context
 * (which imports the data-provider that defines those hooks).
 */
const isAuthenticated = atom<boolean>(false);

/**
 * Is the conversation rail showing? ONE value, in ONE place.
 *
 * It used to be a `useState` in Root whose persistence was hand-written at
 * three separate call sites — Nav, MobileNav and OpenSidebar each did their own
 * `localStorage.setItem('navVisible', …)` beside their own setter call. Three
 * writers of one fact is three chances for them to disagree, and the layout
 * consequence was drawn twice on top of that (the rail's transform AND a
 * translate on the content pane), which is how one boolean produced a drawer
 * that overlaid the page and shoved it sideways at the same time.
 *
 * SHUT on the first visit, at every width. This is the PINNED state, not
 * "is there a sidebar" — unpinned, the desktop still has the rail, and the rail
 * reaches the list, search and the account through the mark. So the default
 * costs a visitor nothing and buys the thing they came for: the conversation,
 * centred, with the reef behind it instead of a column of chrome they have not
 * asked for yet. A phone was already shut; this is the desktop joining it.
 *
 * After that the stored value is the answer, which is why this is read once at
 * module load rather than on every render.
 */
const navVisible = atomWithLocalStorage('navVisible', false);

export default {
  hideBannerHint,
  messageAttachmentsMap,
  conversationAttachmentsSelector,
  queriesEnabled,
  isAuthenticated,
  navVisible,
};
