/**
 * The composer's mic is DICTATION — a way of typing, not a spoken conversation.
 *
 * What it must do is put what it hears into the composer and then stop: the
 * transcript appears while you speak and STAYS there for you to read and send
 * yourself. What it must NOT do is the half that would make it a conversation,
 * and both halves are pinned here because each was once true — nothing is sent
 * on a pause, and no reply is ever read back, not on a typed turn and not when
 * the mic opens on a thread that already has an answer in it.
 *
 * A refused microphone leaves the typed composer working, with the reason on
 * the button.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';

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
  /* The anchor only decorates whatever it is handed; the button underneath is
     what every assertion here reaches for, so it is rendered directly. */
  TooltipAnchor: ({ render }: { render: React.ReactElement }) => render,
}));

jest.mock('@hanzochat/data-provider', () => ({
  dataService: { speechToText: jest.fn(), textToSpeech: jest.fn() },
}));

jest.mock('jotai', () => ({
  useAtomValue: (atom: { key?: string }) =>
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
    speechSynthesis: {
      speak: (u: { text: string; onend?: () => void }) => {
        spoken.push(u.text);
        u.onend?.();
      },
      cancel: () => {},
    },
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
  render(<Mic disabled={false} {...props} />);

const click = async () => {
  await act(async () => {
    screen.getByRole('button').click();
  });
};

/** An open microphone is a fact about the PAGE, so a case that opens one
 *  closes it, exactly as a user would. */
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
  await hangUp();
});

it('stays silent for a typed turn — no conversation, no voice', async () => {
  const view = composer();

  mockLatest.current = { messageId: 'a1', isCreatedByUser: false, text: 'Here is a draft.' };
  await act(async () => {
    view.rerender(<Mic disabled={false} />);
  });

  expect(spoken).toEqual([]);
});

it('does not replay the last answer when the mic opens mid-thread', async () => {
  mockLatest.current = { messageId: 'a1', isCreatedByUser: false, text: 'Said before.' };
  const view = composer();
  await click();
  await act(async () => {
    view.rerender(<Mic disabled={false} />);
  });

  expect(spoken).toEqual([]);
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
  expect(mockSetValue).not.toHaveBeenCalled();
});

