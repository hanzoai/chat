import { act, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import Preview from './Panel';
import store from '~/store';

/**
 * A REFUSED FRAME IS A STATE, and this is the test that says so.
 *
 * `frame-src` (api/server/csp.js) names the only origins this page may frame,
 * so most URLs a reader types are refused — and the browser's refusal is
 * SILENT to the reader: the frame loads `about:blank`, keeps its full box, and
 * says nothing outside the devtools console. Measured before the fix: a
 * 1161×179.3 rectangle with zero content and no message anywhere on screen.
 *
 * The signal is the `securitypolicyviolation` the document dispatches. It is an
 * exact answer, and it has to be — measured in Chromium, the two heuristics one
 * would reach for first BOTH fail here:
 *   - "read the frame's document": the sandbox gives every frame an opaque
 *     origin, so a loaded page and a refused one are byte-identical from out
 *     here (`contentDocument` null, every property access a SecurityError);
 *   - "time it": a refusal lands in ~3ms and a same-origin page in ~5ms.
 */

const TAB = 'tab-under-test';
const URL_TYPED = 'https://example.com';
const ORIGIN = 'https://example.com';

function paint(url: string) {
  const jotai = createStore();
  jotai.set(store.preview(TAB), url);
  const view = render(
    <Provider store={jotai}>
      <Preview tabId={TAB} />
    </Provider>,
  );
  return { ...view, jotai };
}

/**
 * The event as Chromium dispatches it, minus the parts we do not read.
 * `SecurityPolicyViolationEvent` has no constructor in jsdom, and the handler
 * only ever reads three fields, so a plain Event carrying them is the honest
 * stand-in — it cannot pass a handler that reads anything else.
 */
function violate(over: { blockedURI?: string; effectiveDirective?: string } = {}) {
  const event = Object.assign(new Event('securitypolicyviolation'), {
    blockedURI: ORIGIN,
    effectiveDirective: 'frame-src',
    violatedDirective: 'frame-src',
    ...over,
  });
  // The browser dispatches this outside React's knowledge, so the render it
  // schedules has to be flushed here or every assertion below reads the frame
  // BEFORE the refusal lands — and the negative cases would pass either way.
  act(() => {
    document.dispatchEvent(event);
  });
}

const frame = (container: HTMLElement) => container.querySelector('iframe');

describe('a framed page', () => {
  it('frames an http(s) URL', () => {
    const { container } = paint(URL_TYPED);
    expect(frame(container)).toHaveAttribute('src', 'https://example.com/');
  });

  it('never frames a scheme that runs in the embedder', () => {
    // `javascript:` executes in THIS page's context before any sandbox applies.
    const { container } = paint('javascript:alert(1)');
    expect(frame(container)).toBeNull();
    expect(screen.getByTestId('preview-state')).toHaveTextContent(/refuses to be embedded/i);
  });
});

describe('a page this policy refuses to frame', () => {
  it('says so, instead of leaving a blank rectangle', () => {
    const { container } = paint(URL_TYPED);
    expect(frame(container)).not.toBeNull();

    violate();

    expect(frame(container)).toBeNull();
    const state = screen.getByTestId('preview-state');
    expect(state).toHaveTextContent(/can't embed this page/i);
  });

  it('offers the way out: the URL, opening in a new tab', () => {
    paint(URL_TYPED);
    violate();

    const link = screen.getByRole('link', { name: /example\.com/ });
    expect(link).toHaveAttribute('href', 'https://example.com/');
    expect(link).toHaveAttribute('target', '_blank');
    // No referrer and no opener: a refused page must not gain either.
    expect(link).toHaveAttribute('rel', 'noreferrer noopener');
  });

  it('shows the address once — the refusal owns it while it is refused', () => {
    paint(URL_TYPED);
    violate();

    expect(screen.getAllByRole('link', { name: /example\.com/ })).toHaveLength(1);
  });
});

describe('a violation that is not this frame', () => {
  it('ignores another origin — one refusal must not blank a different page', () => {
    const { container } = paint(URL_TYPED);

    violate({ blockedURI: 'https://world.hanzo.ai' });

    expect(frame(container)).not.toBeNull();
  });

  it('ignores another directive: an image this page refused is not this frame', () => {
    const { container } = paint(URL_TYPED);

    violate({ effectiveDirective: 'img-src' });

    expect(frame(container)).not.toBeNull();
  });
});

describe('the refusal is per page, not per tab', () => {
  it('clears when the reader types a different URL', () => {
    const { container, jotai } = paint(URL_TYPED);
    violate();
    expect(frame(container)).toBeNull();

    act(() => {
      jotai.set(store.preview(TAB), 'https://world.hanzo.ai');
    });

    expect(frame(container)).toHaveAttribute('src', 'https://world.hanzo.ai/');
  });
});
