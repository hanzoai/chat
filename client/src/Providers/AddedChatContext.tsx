import { createContext, useContext } from 'react';
import type { TConversation } from '@hanzochat/data-provider';
import type { Setter, ConvoGenerator } from '~/common';

type TAddedChatContext = {
  conversation: TConversation | null;
  setConversation: Setter<TConversation | null>;
  generateConversation: ConvoGenerator;
};

export const AddedChatContext = createContext<TAddedChatContext>({} as TAddedChatContext);
export const useAddedChatContext = () => useContext(AddedChatContext);
