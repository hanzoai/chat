import { Provider } from 'jotai';
import { render, screen } from '@testing-library/react';

import Turn from '../Turn';
import { USER_TURN } from '~/common/turn';

/**
 * The turn frame, which three components used to carry a copy of.
 *
 * What is asserted here is not decoration — it is the contract the rest of the
 * app reaches the turn through. `id` is how the scroll machinery and every
 * anchor address a message; `.message-render` is how `SelectionAsk` decides a
 * selection lies inside a reply (`closest('.message-render')`) rather than in
 * the composer or the chrome; the glass bubble on the user's side and its
 * absence on the reply's is the whole of how this app says who is speaking,
 * now that there is no avatar and no sender name.
 *
 * `@hanzo/ui/chat`'s `Message` is the same contract minus the first two: it
 * accepts neither an id nor an accessible name, so the assertions below are
 * also the list of what has to arrive upstream before the frame can be it.
 */
const at = (node: HTMLElement | null) => node as HTMLElement;

function renderTurn(ui: React.ReactElement) {
  return render(<Provider>{ui}</Provider>);
}

describe('Turn', () => {
  it('is addressable and announced', () => {
    renderTurn(
      <Turn role="assistant" id="message-1" label="Hanzo said something">
        <p>the reply</p>
      </Turn>,
    );

    const turn = at(document.getElementById('message-1'));
    expect(turn).toBeInTheDocument();
    expect(turn).toHaveAttribute('aria-label', 'Hanzo said something');
  });

  it('carries the hook SelectionAsk looks for', () => {
    renderTurn(
      <Turn role="assistant" id="message-1">
        <p>the reply</p>
      </Turn>,
    );

    expect(at(screen.getByText('the reply')).closest('.message-render')).not.toBeNull();
  });

  it('gives the user a glass bubble and the reply none', () => {
    const { unmount } = renderTurn(
      <Turn role="user" id="u">
        <p>mine</p>
      </Turn>,
    );
    const bubble = at(screen.getByText('mine').parentElement);
    USER_TURN.split(' ').forEach((c) => expect(bubble).toHaveClass(c));
    expect(at(document.getElementById('u')).querySelector('.user-turn')).not.toBeNull();
    unmount();

    renderTurn(
      <Turn role="assistant" id="a">
        <p>theirs</p>
      </Turn>,
    );
    const plain = at(screen.getByText('theirs').parentElement);
    expect(plain).not.toHaveClass('glass');
    expect(at(document.getElementById('a')).querySelector('.agent-turn')).not.toBeNull();
  });

  it('shows the action strip when settled', () => {
    renderTurn(
      <Turn role="assistant" id="m" actions={<button type="button">Copy</button>}>
        <p>done</p>
      </Turn>,
    );

    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('holds the strip open instead of rendering it while streaming', () => {
    renderTurn(
      <Turn role="assistant" id="m" busy actions={<button type="button">Copy</button>}>
        <p>streaming</p>
      </Turn>,
    );

    // The strip's height is reserved so the turn does not jump when it lands.
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });

  it('takes the wider track when content renders beside the reply', () => {
    const { unmount } = renderTurn(
      <Turn role="assistant" id="narrow">
        <p>a</p>
      </Turn>,
    );
    const narrow = at(document.getElementById('narrow')).className;
    unmount();

    renderTurn(
      <Turn role="assistant" id="wide" wide>
        <p>b</p>
      </Turn>,
    );
    expect(at(document.getElementById('wide')).className).not.toEqual(narrow);
  });
});
