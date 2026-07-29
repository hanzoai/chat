import { request } from '@hanzochat/data-provider';
import { getHanzoIamSdk } from '~/utils/iam';
import { trySilentSso } from '~/utils/login';

jest.mock('~/utils/iam');
jest.mock('@hanzochat/data-provider', () => ({
  request: { post: jest.fn(), dispatchTokenUpdatedEvent: jest.fn() },
  iamSession: () => '/v1/chat/auth/iam/session',
}));

const signinSilent = jest.fn();
const mockedSdk = getHanzoIamSdk as jest.MockedFunction<typeof getHanzoIamSdk>;
const post = request.post as jest.MockedFunction<typeof request.post>;
const dispatch = request.dispatchTokenUpdatedEvent as jest.MockedFunction<
  typeof request.dispatchTokenUpdatedEvent
>;

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockedSdk.mockReturnValue({ signinSilent } as never);
});

describe('trySilentSso', () => {
  it('adopts the hanzo.id session so a user signed in on another Hanzo domain is not anonymous here', async () => {
    signinSilent.mockResolvedValue({ accessToken: 'at', idToken: 'it' });
    post.mockResolvedValue({ token: 'chat-jwt' } as never);

    await expect(trySilentSso()).resolves.toBe('chat-jwt');

    // The SAME bridge the interactive callback posts to — one session-minting
    // path, reached two ways.
    expect(post).toHaveBeenCalledWith('/v1/chat/auth/iam/session', {
      accessToken: 'at',
      idToken: 'it',
    });
    expect(dispatch).toHaveBeenCalledWith('chat-jwt');
  });

  it('attempts at most once per tab, so an anonymous render loop cannot spam the issuer', async () => {
    signinSilent.mockResolvedValue(null);

    await trySilentSso();
    await trySilentSso();
    await trySilentSso();

    expect(signinSilent).toHaveBeenCalledTimes(1);
  });

  it('returns null when the browser has no hanzo.id session — the common case, not an error', async () => {
    signinSilent.mockResolvedValue(null);

    await expect(trySilentSso()).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('returns null when the silent iframe is blocked outright (third-party cookie policy)', async () => {
    signinSilent.mockRejectedValue(new Error('blocked'));

    // A thrown iframe is still just "still anonymous". It must not surface as an
    // error to a visitor who never asked to log in.
    await expect(trySilentSso()).resolves.toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not adopt a session when the bridge returns no token', async () => {
    signinSilent.mockResolvedValue({ accessToken: 'at', idToken: 'it' });
    post.mockResolvedValue({} as never);

    await expect(trySilentSso()).resolves.toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
