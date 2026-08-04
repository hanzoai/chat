/**
 * Proves the jest harness can render @hanzo/ui 8.x primitives at all — the
 * migration off Radix is blocked on this, so it is worth a test of its own.
 *
 * Three things had to be true and each was broken:
 *   1. jest.config transform must claim `.mjs` (@hanzo/gui's ESM entry).
 *   2. `react-native-svg` must be stubbed (see test/react-native-svg.stub.js).
 *   3. `createGui` must have run — setupTests.js requires the shared config.
 *
 * The provider wrapper below is NOT optional and is not a test artefact: in the
 * app every component sits inside the GuiProvider App.jsx mounts.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiTestProvider } from 'test/gui-provider';
import { Checkbox } from '@hanzo/ui/primitives/Checkbox';
import { Switch } from '@hanzo/ui/primitives/Switch';

const wrap = (ui: React.ReactNode) => render(<GuiTestProvider>{ui}</GuiTestProvider>);

describe('@hanzo/ui primitives under jest', () => {
  it('Checkbox reports a change when clicked', async () => {
    const onCheckedChange = jest.fn();
    wrap(<Checkbox aria-label="cb" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByLabelText('cb'));
    expect(onCheckedChange).toHaveBeenCalled();
  });

  it('Switch reports a change when clicked', async () => {
    const onCheckedChange = jest.fn();
    wrap(<Switch aria-label="sw" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByLabelText('sw'));
    expect(onCheckedChange).toHaveBeenCalled();
  });

  /**
   * The whole justification for CheckboxProps' third, name-less branch is that
   * `aria-hidden` really does take the box out of the accessibility tree, so a
   * name on it would be read by nothing. If that stopped being true the branch
   * would be a hole that lets an anonymous checkbox reach a screen reader.
   *
   * Positive control first, so this cannot pass by finding nothing at all.
   */
  it('a named checkbox IS in the accessibility tree', () => {
    wrap(<Checkbox aria-label="Auto-send prompts" checked />);
    expect(screen.getByRole('checkbox', { name: 'Auto-send prompts' })).toBeInTheDocument();
  });

  it('an aria-hidden checkbox is NOT in the accessibility tree', () => {
    // The decorative shape AutoSendPrompt renders: the surrounding Button owns
    // the name and `aria-pressed`; the box is a non-focusable glyph.
    wrap(<Checkbox checked tabIndex={-1} aria-hidden />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
