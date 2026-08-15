import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'jotai';
import { seed } from 'test/store';
import { SystemRoles } from '@hanzochat/data-provider';
import type { TStartupConfig, TUser } from '@hanzochat/data-provider';
import useNewConvo from '../useNewConvo';
import store from '~/store';

/**
 * What a new conversation opens on.
 *
 * A guest is served one model — the free route the server pins them to — so the
 * client opens there: the id the conversation holds is the id it sends and the
 * name the model chip reads. The server's override is the backstop, not the
 * thing the visitor sees.
 *
 * The catalog below deliberately excludes the pin, which is its real shape: the
 * free route is not one of the endpoint's offered models, so a conversation that
 * settles its model against that list drops the pin and lands on `enso`.
 */

const mockGuestModel = 'nvidia/nemotron-nano-9b-v2:free';
const mockStartupConfig = {
  allowGuestChat: true,
  guestEndpoint: 'Hanzo',
  guestModel: mockGuestModel,
} as unknown as TStartupConfig;
const mockEndpoints = { Hanzo: { type: 'custom', userProvide: false, order: 0 } };
const mockModels = { Hanzo: ['enso', 'zen5-flash'] };

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));
jest.mock('@hanzochat/data-provider/react-query', () => ({
  useGetModelsQuery: () => ({ data: mockModels }),
}));
jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: mockStartupConfig }),
  useGetEndpointsQuery: () => ({ data: mockEndpoints }),
  useGetRoutingDefaults: () => ({ data: undefined }),
  useDeleteFilesMutation: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('~/hooks', () => ({ useHasAccess: () => true }));
jest.mock('../Assistants/useAssistantListMap', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('../useChatBadges', () => ({ useResetChatBadges: () => jest.fn() }));
jest.mock('../Agents', () => ({ useApplyModelSpecEffects: () => jest.fn() }));
jest.mock('../Audio', () => ({ usePauseGlobalAudio: () => ({ pauseGlobalAudio: jest.fn() }) }));

const asUser = (role: string) => ({ id: 'x', role, name: 'x' }) as unknown as TUser;

function opened(user: TUser) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={seed((s) => s.set(store.user, user))}>{children}</Provider>
  );
  const { result } = renderHook(
    () => ({ ...useNewConvo(), ...store.useCreateConversationAtom(0) }),
    {
      wrapper,
    },
  );
  act(() => result.current.newConversation());
  return result.current.conversation;
}

describe('a new conversation', () => {
  beforeEach(() => localStorage.clear());

  it('opens a guest on the model the server serves them', () => {
    const convo = opened(asUser(SystemRoles.GUEST));

    expect(convo?.endpoint).toBe('Hanzo');
    expect(convo?.endpointType).toBe('custom');
    expect(convo?.model).toBe(mockGuestModel);
  });

  it('leaves a signed-in session to resolve its own default', () => {
    expect(opened(asUser(SystemRoles.USER))?.model).toBe('enso');
  });
});
