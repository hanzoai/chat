import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FREE_MODEL, freeCopy, grantConsent } from '@hanzo/ai';
import { Notice } from '../index';
import { FREE_OFFERED } from '~/utils/free';

/**
 * The way forward when a paid turn cannot be billed.
 *
 * A refusal used to end at a billing link, which is a door the visitor may not
 * want and cannot walk through in the next second. Free costs nothing and
 * serves, so the offer is the answer — and taking it moves the conversation
 * rather than telling the visitor to go do something elsewhere.
 */

const mockSetOption = jest.fn();
const mockOption = jest.fn(() => mockSetOption);
const mockRegenerate = jest.fn();
const mockState = {
  guest: false,
  conversation: { endpoint: 'hanzo', model: 'gpt-5' } as { endpoint?: string; model?: string },
};

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: { interface: {} } }),
}));

jest.mock('~/hooks', () => ({
  useAuthContext: () => ({ isGuest: mockState.guest }),
  useSetIndexOptions: () => ({ setOption: mockOption }),
}));

jest.mock('~/Providers', () => ({
  useChatContext: () => ({
    conversation: mockState.conversation,
    latestMessage: { parentMessageId: 'parent-1' },
    regenerate: mockRegenerate,
  }),
}));

jest.mock('@hanzochat/client', () => ({
  Button: ({ children, ...rest }: { children: React.ReactNode }) => (
    <button {...rest}>{children}</button>
  ),
  OGDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  OGDialogTemplate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/* The offer arrives as a window event from whichever send path met the refusal,
   so it lands outside React's own dispatch and has to be flushed. */
const offer = () =>
  act(() => {
    window.dispatchEvent(new CustomEvent(FREE_OFFERED, { detail: { offer: 'switch' } }));
  });

describe('the free offer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
    mockState.guest = false;
    mockState.conversation = { endpoint: 'hanzo', model: 'gpt-5' };
  });

  it('says nothing until a turn is refused', () => {
    render(<Notice />);
    expect(screen.queryByText(freeCopy.switchCta)).not.toBeInTheDocument();
  });

  it('offers Enso Free by name when the paid route could not serve', () => {
    render(<Notice />);
    offer();

    expect(screen.getByText(freeCopy.paidTitle)).toBeInTheDocument();
    expect(screen.getByText(freeCopy.paidBody)).toBeInTheDocument();
    // The branded route, never a vendor slug — the same words every Hanzo
    // surface uses for this decision.
    expect(screen.getByText(freeCopy.switchCta)).toBeInTheDocument();
  });

  it('moves the conversation to the free route and resends the refused turn', async () => {
    // Consent already on record, so the move is the only thing under test here.
    grantConsent(window.localStorage);
    const { rerender } = render(<Notice />);
    offer();

    await userEvent.click(screen.getByText(freeCopy.switchCta));

    expect(mockOption).toHaveBeenCalledWith('model');
    expect(mockSetOption).toHaveBeenCalledWith(FREE_MODEL);

    // The resend waits for the move to LAND. A send reads the conversation as
    // it stood when it was built, so resending in the same breath would put the
    // refused turn back on the model that just refused it.
    expect(mockRegenerate).not.toHaveBeenCalled();

    mockState.conversation = { endpoint: 'hanzo', model: FREE_MODEL };
    act(() => rerender(<Notice />));

    expect(mockRegenerate).toHaveBeenCalledWith({ parentMessageId: 'parent-1' });
  });

  /* Nothing is served free without agreement: the switch waits on the consent
     dialog, so an un-consented click moves nothing. */
  it('asks for consent before moving anything', async () => {
    render(<Notice />);
    offer();

    await userEvent.click(screen.getByText(freeCopy.switchCta));

    expect(mockSetOption).not.toHaveBeenCalled();
    expect(mockRegenerate).not.toHaveBeenCalled();
  });

  it('offers a guest nothing — they are already on free and pay for nothing', () => {
    mockState.guest = true;
    render(<Notice />);
    offer();

    expect(screen.queryByText(freeCopy.switchCta)).not.toBeInTheDocument();
  });

  it('drops the offer when it is declined', async () => {
    render(<Notice />);
    offer();

    await userEvent.click(screen.getByText(freeCopy.dismissCta));

    expect(screen.queryByText(freeCopy.switchCta)).not.toBeInTheDocument();
  });
});
