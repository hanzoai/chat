import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider, useSetAtom } from 'jotai';
import { seed } from 'test/store';
import { LocalStorageKeys, SystemRoles } from '@hanzochat/data-provider';
import type { TConversation, TUser } from '@hanzochat/data-provider';
import store from '..';

/**
 * A guest's endpoint and model are a server-side pin (`GUEST_ENDPOINT` /
 * `GUEST_MODEL`), not a preference. Persisting them hands the guest's capped
 * model to the next principal on this browser — the same person, signed in a
 * redirect later — so the signed-in session never resolves its own default.
 */
const guestConvo = {
  conversationId: 'new',
  title: 'New Chat',
  endpoint: 'Hanzo',
  endpointType: 'custom',
  model: 'zen5-flash',
  tools: [],
} as unknown as TConversation;

const wrapper =
  (user: TUser) =>
  ({ children }: { children: ReactNode }) => (
    <Provider initializeState={({ set }) => set(store.user, user)}>{children}</Provider>
  );

const asUser = (role: string) => ({ id: 'x', role, name: 'x' }) as unknown as TUser;

function setConversation(user: TUser, conversation: TConversation) {
  const { result } = renderHook(() => useSetAtom(store.conversationByIndex(0)), {
    wrapper: wrapper(user),
  });
  act(() => result.current(conversation));
}

describe('conversation persistence is principal-scoped', () => {
  beforeEach(() => localStorage.clear());

  it('remembers the model a signed-in user is on', () => {
    setConversation(asUser(SystemRoles.USER), guestConvo);

    expect(localStorage.getItem(LocalStorageKeys.LAST_MODEL)).toBe('{"Hanzo":"zen5-flash"}');
    expect(localStorage.getItem(`${LocalStorageKeys.LAST_CONVO_SETUP}_0`)).not.toBeNull();
  });

  it('remembers nothing from a guest, so a later sign-in resolves its own default', () => {
    setConversation(asUser(SystemRoles.GUEST), guestConvo);

    expect(localStorage.getItem(LocalStorageKeys.LAST_MODEL)).toBeNull();
    expect(localStorage.getItem(`${LocalStorageKeys.LAST_CONVO_SETUP}_0`)).toBeNull();
  });
});
