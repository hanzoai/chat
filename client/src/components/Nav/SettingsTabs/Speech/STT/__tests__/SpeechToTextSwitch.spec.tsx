import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from 'test/layout-test-utils';
import SpeechToTextSwitch from '../SpeechToTextSwitch';
import { Provider } from 'jotai';

describe('SpeechToTextSwitch', () => {
  /**
   * Mock function to set the speech-to-text state.
   */
  let mockSetSpeechToText: jest.Mock<void, [boolean]> | ((value: boolean) => void) | undefined;

  beforeEach(() => {
    mockSetSpeechToText = jest.fn();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <Provider>
        <SpeechToTextSwitch />
      </Provider>,
    );

    expect(getByTestId('SpeechToText')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the switch is toggled', () => {
    const { getByTestId } = render(
      <Provider>
        <SpeechToTextSwitch onCheckedChange={mockSetSpeechToText} />
      </Provider>,
    );
    const switchElement = getByTestId('SpeechToText');
    fireEvent.click(switchElement);

    expect(mockSetSpeechToText).toHaveBeenCalledWith(false);
  });
});
