import { render } from '@testing-library/react';
import Markdown from '../Markdown';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' } }) }));
jest.mock('~/hooks', () => ({ useLocalize: () => (k: string) => k }));
jest.mock('jotai', () => ({ useAtomValue: () => false, atom: () => ({}) }));
jest.mock('~/store', () => ({ __esModule: true, default: { LaTeXParsing: {} } }));

describe('Markdown while the answer is still empty', () => {
  it('shows the quip on the latest message, where it used to show nothing', () => {
    const { container } = render(<Markdown content="" isLatestMessage={true} />);
    const said = container.querySelector('[aria-hidden="true"]')?.textContent ?? '';
    expect(said.length).toBeGreaterThan(0);
    // The dot's own rule is `.submitting .result-thinking:empty:after`; this
    // branch used to render a bare <p>, so neither words nor dot appeared.
    expect(container.querySelector('.submitting .result-thinking')).toBeTruthy();
  });

  it('says nothing on an older empty message, which is finished', () => {
    const { container } = render(<Markdown content="" isLatestMessage={false} />);
    expect(container.textContent).toBe('');
  });
});
