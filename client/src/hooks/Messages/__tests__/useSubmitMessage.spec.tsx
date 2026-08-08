/**
 * Sending a message is not where a slash command is read.
 *
 * Three things reach `submitMessage` with text the viewer never typed: a
 * conversation starter written into an agent's configuration, a prompt someone
 * shared from the prompt library (with `autoSendPrompts` on), and a `?prompt=`
 * carried in a link. If a command were read here, any of those could redress a
 * stranger's chat and point an `<img>` at a host of their choosing — from a
 * link, with one click, and with nothing shown first.
 *
 * So the hook must SEND `/bg …` like any other line. The composer reads the
 * command before it ever gets here (components/Chat/Input/ChatForm), which is
 * where `/build` and `/agent` are read too.
 */
import { renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';
import useSubmitMessage from '../useSubmitMessage';
import store from '~/store';

const mockAsk = jest.fn();

jest.mock('~/Providers', () => ({
  useChatContext: () => ({
    ask: mockAsk,
    index: 0,
    getMessages: () => [],
    setMessages: jest.fn(),
    latestMessage: null,
  }),
  useChatFormContext: () => ({ reset: jest.fn(), getValues: () => '' }),
  useAddedChatContext: () => ({ conversation: null }),
}));

jest.mock('~/hooks/AuthContext', () => ({
  useAuthContext: () => ({ user: { name: 'Tester' } }),
}));

const reef = 'https://www.youtube.com/watch?v=6lZ3CookYNg';

function send(text: string) {
  const jotai = createStore();
  jotai.set(store.backdrop, {
    source: 'off' as const,
    photo: '',
    video: reef,
    playlist: [],
    loop: true,
  });
  const wrap = ({ children }: { children: ReactNode }) => (
    <Provider store={jotai}>{children}</Provider>
  );
  const { result } = renderHook(() => useSubmitMessage(), { wrapper: wrap });
  result.current.submitMessage({ text });
  return jotai.get(store.backdrop);
}

describe('useSubmitMessage', () => {
  beforeEach(() => mockAsk.mockClear());

  it('sends an ordinary message', () => {
    send('what is the weather');
    expect(mockAsk).toHaveBeenCalledWith({ text: 'what is the weather' }, expect.anything());
  });

  it.each([
    '/bg off',
    '/bg photo https://beacon.example/pixel.png',
    '/bg video https://youtu.be/6lZ3CookYNg',
    '/bg add https://twitch.tv/monstercat',
    '/background off',
  ])('sends %p rather than acting on it', (line) => {
    const after = send(line);
    expect(mockAsk).toHaveBeenCalledWith({ text: line }, expect.anything());
    expect(after).toEqual({
      source: 'off',
      photo: '',
      video: reef,
      playlist: [],
      loop: true,
    });
  });
});
