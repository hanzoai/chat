import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OGDialogTemplate from './OGDialogTemplate';
import { Dialog } from '@radix-ui/react-dialog';
import { Provider } from 'jotai';

/**
 * Was `DialogTemplate.spec.tsx`. The legacy dialog stack it covered — `Dialog`
 * + `DialogTemplate` — is gone; this is the same coverage pointed at the
 * template that survived, so the collapse did not cost a test.
 *
 * Two assertions had to change with it, and both were the point of the fork:
 * the cancel control is localized here (the legacy one hardcoded the lowercase
 * literal `cancel`), and `showCloseButton` defaults to false rather than true.
 */
const open = (ui: React.ReactNode) =>
  render(
    <Provider>
      <Dialog open onOpenChange={() => undefined}>
        {ui}
      </Dialog>
    </Provider>,
  );

describe('OGDialogTemplate', () => {
  let mockSelectHandler: jest.Mock;

  beforeEach(() => {
    mockSelectHandler = jest.fn();
  });

  it('renders every slot it is given', () => {
    open(
      <OGDialogTemplate
        title="Test Dialog"
        description="Test Description"
        main={<div>Main Content</div>}
        buttons={<button>Button</button>}
        leftButtons={<button>Left Button</button>}
        selection={{ selectHandler: mockSelectHandler, selectText: 'Select' }}
      />,
    );

    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.getByText('Left Button')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
    // Localized, not the legacy hardcoded 'cancel' literal.
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  /**
   * The old version of this rendered an EMPTY dialog and asserted the seven
   * strings were absent — which is true of any empty tree and exercised nothing.
   * Rendering the template with only its required prop is the test that was
   * meant: the title shows, and every optional slot stays out of the DOM.
   */
  it('omits the slots it is not given', () => {
    open(<OGDialogTemplate title="Test Dialog" />);

    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
    expect(screen.queryByText('Main Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Button')).not.toBeInTheDocument();
    expect(screen.queryByText('Left Button')).not.toBeInTheDocument();
    expect(screen.queryByText('Select')).not.toBeInTheDocument();
  });

  it('calls selectHandler when the select button is clicked', () => {
    open(
      <OGDialogTemplate
        title="Test Dialog"
        selection={{ selectHandler: mockSelectHandler, selectText: 'Select' }}
      />,
    );

    fireEvent.click(screen.getByText('Select'));

    expect(mockSelectHandler).toHaveBeenCalled();
  });
});
