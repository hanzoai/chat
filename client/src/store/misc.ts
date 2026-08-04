import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { TAttachment } from '@hanzochat/data-provider';
import { atomWithLocalStorage } from './utils';
import { BadgeItem } from '~/common';

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

const isEditingBadges = atom<boolean>(false);

const chatBadges = atomWithLocalStorage<Pick<BadgeItem, 'id'>[]>('chatBadges', [
  // When adding new badges, make sure to add them to useChatBadges.ts as well and add them as last item
  // DO NOT CHANGE THE ORDER OF THE BADGES ALREADY IN THE ARRAY
  { id: '1' },
  // { id: '2' },
]);

export default {
  hideBannerHint,
  messageAttachmentsMap,
  conversationAttachmentsSelector,
  queriesEnabled,
  isAuthenticated,
  isEditingBadges,
  chatBadges,
};
