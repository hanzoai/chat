import { act, fireEvent, render, screen } from '@testing-library/react';

/**
 * Ask-about-a-selection submits on the shell's chord, and only on the shell's
 * chord.
 *
 * This composer used to read `Enter && !shiftKey` directly, which is the same
 * rule the main composer had already outgrown: a Japanese, Chinese or Korean
 * writer pressing Enter to ACCEPT an IME candidate sent the half-typed word
 * instead. `sends` refuses a keystroke the IME has claimed — on all three
 * signals browsers use, not just the one Chrome sets — so the case below is the
 * regression this spec exists to hold.
 */

const mockSubmit = jest.fn();

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useSubmitMessage: () => ({ submitMessage: mockSubmit }),
}));

import SelectionAsk from '../SelectionAsk';

/** jsdom lays nothing out, and the overlay refuses a zero-sized selection. */
Range.prototype.getBoundingClientRect = () =>
  ({ x: 10, y: 200, top: 200, bottom: 220, left: 10, right: 90, width: 80, height: 20 }) as DOMRect;

/** Put a real selection inside a rendered reply so the "Ask" button appears. */
function selectInAMessage(text: string) {
  const host = document.createElement('div');
  host.className = 'message-render';
  host.textContent = text;
  document.body.appendChild(host);

  const range = document.createRange();
  range.selectNodeContents(host);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

async function openComposer() {
  render(<SelectionAsk />);
  selectInAMessage('the sentence being asked about');
  // The overlay reads the selection one tick after mouseup, so the drag is over.
  fireEvent.mouseUp(document);
  act(() => jest.advanceTimersByTime(1));
  fireEvent.click(await screen.findByRole('button', { name: 'com_ui_ask_about_this' }));
  return screen.getByTestId('selection-ask-input');
}

beforeEach(() => {
  jest.useFakeTimers({ advanceTimers: true });
  mockSubmit.mockClear();
  document.body.innerHTML = '';
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SelectionAsk key handling', () => {
  it('sends on Enter', async () => {
    const input = await openComposer();
    fireEvent.change(input, { target: { value: 'why' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit.mock.calls[0][0].text).toContain('why');
  });

  it('leaves Shift+Enter to the textarea', async () => {
    const input = await openComposer();
    fireEvent.change(input, { target: { value: 'why' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('does NOT send the Enter that accepts an IME candidate', async () => {
    const input = await openComposer();
    fireEvent.change(input, { target: { value: 'なぜ' } });

    // The three signals a browser uses, one per press. Every one of them was
    // sending before, because none of them was being read.
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(input, { key: 'Process' });
    const composing = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composing, 'isComposing', { value: true });
    input.dispatchEvent(composing);

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('refuses a whitespace-only draft', async () => {
    const input = await openComposer();
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
