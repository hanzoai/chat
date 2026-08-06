import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { GuiTestProvider } from 'test/gui-provider';
import type { Backdrop as Config } from '~/utils/backdrop';
import BackdropSettings from './BackdropSettings';
import store from '~/store';

jest.mock('~/data-provider', () => ({
  useUploadFileMutation: () => ({ mutate: jest.fn() }),
}));

const mockShowToast = jest.fn();
jest.mock('@hanzochat/client', () => ({
  ...jest.requireActual('@hanzochat/client'),
  useToastContext: () => ({ showToast: mockShowToast }),
}));

const config = (over: Partial<Config> = {}): Config => ({
  source: 'off',
  photo: '',
  video: '',
  playlist: [],
  loop: true,
  ...over,
});

function open(over: Partial<Config> = {}) {
  const jotai = createStore();
  jotai.set(store.backdrop, config(over));
  // GuiTestProvider is not a test artefact: App.jsx mounts GuiProvider around
  // the whole tree, and the @hanzo/ui 8.x Switch behind the loop toggle refuses
  // to render outside one ("Missing theme.").
  const view = render(
    <GuiTestProvider>
      <QueryClientProvider client={new QueryClient()}>
        <Provider store={jotai}>
          <BackdropSettings />
        </Provider>
      </QueryClientProvider>
    </GuiTestProvider>,
  );
  return { ...view, jotai, read: () => jotai.get(store.backdrop) };
}

describe('BackdropSettings', () => {
  it('offers the four sources, with off among them rather than beside them', () => {
    const { getByTestId } = open();
    fireEvent.click(getByTestId('backdrop-source'));
    ['Off', 'Photo', 'Video', 'Playlist'].forEach((label) => {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
    });
  });

  it('writes the chosen source to the store', () => {
    const { getByTestId, read } = open();
    fireEvent.click(getByTestId('backdrop-source'));
    fireEvent.click(screen.getByRole('option', { name: 'Photo' }));
    expect(read().source).toBe('photo');
  });

  it('writes a pasted image address we serve', () => {
    const { read } = open({ source: 'photo' });
    const field = screen.getByLabelText('Image URL');
    fireEvent.change(field, { target: { value: '/images/reef.jpg' } });
    fireEvent.blur(field);
    expect(read().photo).toBe('/images/reef.jpg');
  });

  it('refuses an image URL that is not a web address', () => {
    const { read } = open({ source: 'photo' });
    const field = screen.getByLabelText('Image URL');
    fireEvent.change(field, { target: { value: 'javascript:alert(1)' } });
    fireEvent.blur(field);
    expect(read().photo).toBe('');
  });

  it('says so out loud when an image from elsewhere is refused', () => {
    // Silence here would be a blank canvas: an image the policy blocks never
    // fires `load`, so nothing would say why the background did not change.
    const { read } = open({ source: 'photo' });
    const field = screen.getByLabelText('Image URL');
    fireEvent.change(field, { target: { value: 'https://attacker.example/p?d=secret' } });
    fireEvent.blur(field);
    expect(read().photo).toBe('');
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error' }),
    );
  });

  it('writes a pasted YouTube URL', () => {
    const { read } = open({ source: 'video' });
    const field = screen.getByLabelText('YouTube URL');
    fireEvent.change(field, { target: { value: 'https://youtu.be/6lZ3CookYNg' } });
    fireEvent.blur(field);
    expect(read().video).toBe('https://youtu.be/6lZ3CookYNg');
  });

  it('adds a link to the playlist', () => {
    const { read } = open({ source: 'playlist' });
    fireEvent.change(screen.getByLabelText('Add'), {
      target: { value: 'https://twitch.tv/monstercat' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(read().playlist).toEqual([
      { url: 'https://twitch.tv/monstercat', provider: 'twitch' },
    ]);
  });

  it('removes a link from the playlist', () => {
    const { read } = open({
      source: 'playlist',
      playlist: [{ url: 'https://youtu.be/6lZ3CookYNg', provider: 'youtube' }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(read().playlist).toEqual([]);
  });

  it('toggles loop through to the single stored configuration', () => {
    const { read } = open({ source: 'playlist', loop: true });
    fireEvent.click(screen.getByTestId('backdropLoop'));
    expect(read().loop).toBe(false);
  });

  describe('a link nothing can embed', () => {
    const netflix = {
      source: 'playlist' as const,
      playlist: [{ url: 'https://www.netflix.com/watch/80100172', provider: 'other' as const }],
    };

    it('is labelled as unplayable rather than shown as a provider', () => {
      open(netflix);
      expect(screen.getByText('Can’t play here')).toBeInTheDocument();
    });

    it('is offered as a link out, in a new tab', () => {
      const { container } = open(netflix);
      const out = screen.getByRole('link', { name: 'https://www.netflix.com/watch/80100172' });
      expect(out).toHaveAttribute('href', 'https://www.netflix.com/watch/80100172');
      expect(out).toHaveAttribute('target', '_blank');
      expect(out).toHaveAttribute('rel', expect.stringContaining('noopener'));
      // and it is never framed
      expect(container.querySelector('iframe')).toBeNull();
    });

    it('still accepts the link — we store it, we just never pretend it plays', () => {
      const { read } = open({ source: 'playlist' });
      fireEvent.change(screen.getByLabelText('Add'), {
        target: { value: 'https://www.netflix.com/watch/80100172' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(read().playlist).toEqual([
        { url: 'https://www.netflix.com/watch/80100172', provider: 'other' },
      ]);
    });
  });

  it('says plainly what can be embedded and never asks for a provider password', () => {
    open({ source: 'video' });
    const note = screen.getByText(/Only YouTube and Twitch can be embedded/);
    expect(note).toHaveTextContent('already signed in to that provider in this browser');
    expect(note).toHaveTextContent('never ask for those passwords');
    expect(screen.queryByLabelText(/password/i)).toBeNull();
  });

  it('says nothing about providers when the backdrop is off', () => {
    open({ source: 'off' });
    expect(screen.queryByText(/Only YouTube and Twitch can be embedded/)).toBeNull();
  });
});
