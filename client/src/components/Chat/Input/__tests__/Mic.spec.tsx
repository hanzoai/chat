/**
 * The composer's mic is a CONVERSATION, not a dictation key.
 *
 * The old AudioRecorder appended a transcript and left it there; you still had
 * to press send, nothing was read back, and a browser without a recogniser got
 * a control that could not work. This pins the four things that make it a
 * conversation instead: the transcript appears while you speak, a pause sends
 * the turn through `ask` (the composer's own path, exactly once), the reply is
 * read back, and a refused microphone leaves the typed composer working with an
 * honest reason on the button.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';

const mockAsk = jest.fn();
const mockSetValue = jest.fn();
const mockReset = jest.fn();
const mockShowToast = jest.fn();
const mockLatest: { current: unknown } = { current: null };

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useGetAudioSettings: () => ({ speechToTextEndpoint: 'browser', textToSpeechEndpoint: 'browser' }),
}));

jest.mock('~/Providers', () => ({
  useChatFormContext: () => ({
    setValue: mockSetValue,
    getValues: () => '',
    reset: mockReset,
  }),
}));

jest.mock('@hanzochat/client', () => ({
  useToastContext: () => ({ showToast: mockShowToast }),
}));

jest.mock('@hanzochat/data-provider', () => ({
  dataService: { speechToText: jest.fn(), textToSpeech: jest.fn() },
}));

jest.mock('recoil', () => ({
  useRecoilValue: (atom: { key?: string }) =>
    atom?.key === 'latestMessage' ? mockLatest.current : 'alloy',
}));

jest.mock('~/store', () => ({
  __esModule: true,
  default: {
    voice: { key: 'voice' },
    latestMessageFamily: () => ({ key: 'latestMessage' }),
  },
}));

jest.mock('~/utils', () => ({
  cn: (...parts: unknown[]) => parts.filter(Boolean).join(' '),
  getLatestText: (message: { text?: string } | null) => message?.text ?? '',
}));

import Mic from '../Mic';

/** A recogniser we can put words into. */
class Fake {
  static live: Fake | null = null;
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    Fake.live = this;
  }
  start() {}
  stop() {
    this.onend?.();
  }
  abort() {}
  hear(text: string, final = false) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: final, 0: { transcript: text } }] });
  }
}

let grant: () => Promise<unknown>;
const spoken: string[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  Fake.live = null;
  mockLatest.current = null;
  spoken.length = 0;
  grant = async () => ({ getTracks: () => [{ stop() {} }] });
  Object.assign(window, {
    SpeechRecognition: Fake,
    isSecureContext: true,
    speechSynthesis: { speak: (u: { text: string; onend?: () => void }) => { spoken.push(u.text); u.onend?.(); }, cancel: () => {} },
    SpeechSynthesisUtterance: class {
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    },
  });
  Object.defineProperty(window.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => grant() },
  });
});

afterEach(() => jest.useRealTimers());

const composer = (props: Partial<React.ComponentProps<typeof Mic>> = {}) =>
  render(<Mic ask={mockAsk} disabled={false} isSubmitting={false} {...props} />);

const click = async () => {
  await act(async () => {
    screen.getByRole('button').click();
  });
};

/**
 * Hang up. An open microphone is a fact about the PAGE — that is what lets a
 * conversation survive this composer remounting on its first turn — so a case
 * that opens one has to end it, exactly as a user would.
 */
const hangUp = async () => {
  if (screen.getByRole('button').getAttribute('aria-pressed') === 'true') await click();
};

it('shows what it is hearing in the composer, and sends nothing yet', async () => {
  composer();
  await click();
  act(() => Fake.live!.hear('draft a launch email'));

  expect(mockSetValue).toHaveBeenLastCalledWith('text', 'draft a launch email', {
    shouldValidate: true,
  });
  expect(mockAsk).not.toHaveBeenCalled();
  await hangUp();
});

it('sends the turn through ask exactly once when the speaker pauses', async () => {
  composer();
  await click();
  act(() => Fake.live!.hear('draft a launch email', true));
  await act(async () => {
    jest.advanceTimersByTime(1_000);
  });

  expect(mockAsk).toHaveBeenCalledTimes(1);
  expect(mockAsk).toHaveBeenCalledWith({ text: 'draft a launch email' });
  expect(mockReset).toHaveBeenCalledWith({ text: '' });
  await hangUp();
});

it('reads a new reply back while the conversation is live', async () => {
  const view = composer();
  await click();

  mockLatest.current = { messageId: 'a1', isCreatedByUser: false, text: 'Here is a draft.' };
  await act(async () => {
    view.rerender(<Mic ask={mockAsk} disabled={false} isSubmitting={false} />);
  });

  expect(spoken).toEqual(['Here is a draft.']);
  await hangUp();
});

it('stays silent for a typed turn — no conversation, no voice', async () => {
  const view = composer();

  mockLatest.current = { messageId: 'a1', isCreatedByUser: false, text: 'Here is a draft.' };
  await act(async () => {
    view.rerender(<Mic ask={mockAsk} disabled={false} isSubmitting={false} />);
  });

  expect(spoken).toEqual([]);
});

it('does not replay the last answer when the mic opens mid-thread', async () => {
  mockLatest.current = { messageId: 'a1', isCreatedByUser: false, text: 'Said before.' };
  const view = composer();
  await click();
  await act(async () => {
    view.rerender(<Mic ask={mockAsk} disabled={false} isSubmitting={false} />);
  });

  expect(spoken).toEqual([]);
  await hangUp();
});

it('keeps the conversation across the remount that sending the first turn causes', async () => {
  // Sending is exactly what makes this surface swap /c/new for /c/<id>, which
  // replaces the composer. The user did not hang up.
  const view = composer();
  await click();
  expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');

  view.unmount();
  composer();
  await act(async () => {
    await Promise.resolve();
  });

  expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  act(() => Fake.live!.hear('and shorter', true));
  await act(async () => {
    jest.advanceTimersByTime(1_000);
  });
  expect(mockAsk).toHaveBeenCalledWith({ text: 'and shorter' });
  await hangUp();
});

it('leaves the typed composer working, with the reason on the button, when refused', async () => {
  grant = async () => {
    throw Object.assign(new Error('no'), { name: 'NotAllowedError' });
  };
  composer();
  await click();

  const button = screen.getByRole('button');
  expect(button).toBeDisabled();
  expect(button.getAttribute('aria-label')).toMatch(/Microphone access was blocked/);
  expect(mockAsk).not.toHaveBeenCalled();
  expect(mockSetValue).not.toHaveBeenCalled();
});

it('tells you rather than dropping a turn spoken over a running reply', async () => {
  composer({ isSubmitting: true });
  await click();
  act(() => Fake.live!.hear('and make it shorter', true));
  await act(async () => {
    jest.advanceTimersByTime(1_000);
  });

  expect(mockAsk).not.toHaveBeenCalled();
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'error' }),
  );
  await hangUp();
});
