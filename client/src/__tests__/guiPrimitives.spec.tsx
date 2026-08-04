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
import { GuiProvider } from '@hanzo/gui';
import guiConfig from '@hanzo/ui/gui-config';
import { Checkbox } from '@hanzo/ui/primitives/Checkbox';
import { Switch } from '@hanzo/ui/primitives/Switch';

const wrap = (ui: React.ReactNode) =>
  render(
    <GuiProvider config={guiConfig} defaultTheme="dark">
      {ui}
    </GuiProvider>,
  );

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
});
