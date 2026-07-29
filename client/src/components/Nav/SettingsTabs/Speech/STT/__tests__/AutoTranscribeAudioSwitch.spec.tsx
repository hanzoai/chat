import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from 'test/layout-test-utils';
import AutoTranscribeAudioSwitch from '../AutoTranscribeAudioSwitch';
import { Provider } from 'jotai';

describe('AutoTranscribeAudioSwitch', () => {
  /**
   * Mock function to set the auto-send-text state.
   */
  let mockSetAutoTranscribeAudio:
    | jest.Mock<void, [boolean]>
    | ((value: boolean) => void)
    | undefined;

  beforeEach(() => {
    mockSetAutoTranscribeAudio = jest.fn();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <Provider>
        <AutoTranscribeAudioSwitch />
      </Provider>,
    );

    expect(getByTestId('AutoTranscribeAudio')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the switch is toggled', () => {
    const { getByTestId } = render(
      <Provider>
        <AutoTranscribeAudioSwitch onCheckedChange={mockSetAutoTranscribeAudio} />
      </Provider>,
    );
    const switchElement = getByTestId('AutoTranscribeAudio');
    fireEvent.click(switchElement);

    expect(mockSetAutoTranscribeAudio).toHaveBeenCalledWith(true);
  });
});
