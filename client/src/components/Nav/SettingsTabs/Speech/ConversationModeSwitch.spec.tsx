import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from 'test/layout-test-utils';
import ConversationModeSwitch from './ConversationModeSwitch';
import { Provider } from 'jotai';

describe('ConversationModeSwitch', () => {
  /**
   * Mock function to set the auto-send-text state.
   */
  let mockSetConversationMode: jest.Mock<void, [boolean]> | ((value: boolean) => void) | undefined;

  beforeEach(() => {
    mockSetConversationMode = jest.fn();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <Provider>
        <ConversationModeSwitch />
      </Provider>,
    );

    expect(getByTestId('ConversationMode')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the switch is toggled', () => {
    const { getByTestId } = render(
      <Provider>
        <ConversationModeSwitch onCheckedChange={mockSetConversationMode} />
      </Provider>,
    );
    const switchElement = getByTestId('ConversationMode');
    fireEvent.click(switchElement);

    expect(mockSetConversationMode).toHaveBeenCalledWith(true);
  });
});
