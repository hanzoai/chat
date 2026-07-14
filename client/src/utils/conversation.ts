import type { TConversation } from '@hanzochat/data-provider';

export const isTemporaryConversation = (conversation?: Partial<TConversation> | null): boolean =>
  conversation?.isTemporary === true ||
  (conversation?.isTemporary === undefined && conversation?.expiredAt != null);
