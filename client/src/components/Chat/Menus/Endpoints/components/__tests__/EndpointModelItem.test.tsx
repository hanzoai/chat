import { render, screen } from '@testing-library/react';
import type { Endpoint } from '~/common';
import { EndpointModelItem, isCurrent } from '../EndpointModelItem';

const mockHandleSelectModel = jest.fn();

jest.mock('~/components/Chat/Menus/Endpoints/ModelSelectorContext', () => ({
  useModelSelectorContext: () => ({ handleSelectModel: mockHandleSelectModel }),
}));

jest.mock('~/components/Chat/Menus/Endpoints/CustomMenu', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    CustomMenuItem: React.forwardRef(function MockMenuItem(
      { children, ...rest }: { children?: React.ReactNode },
      ref: React.Ref<HTMLDivElement>,
    ) {
      return React.createElement('div', { ref, role: 'menuitem', ...rest }, children);
    }),
  };
});

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useFavorites: () => ({
    isFavoriteModel: () => false,
    toggleFavoriteModel: jest.fn(),
    isFavoriteAgent: () => false,
    toggleFavoriteAgent: jest.fn(),
  }),
  useActive: () => ({ ref: { current: null }, isActive: false }),
}));

const baseEndpoint: Endpoint = {
  value: 'anthropic',
  label: 'Anthropic',
  hasModels: true,
  models: [{ name: 'claude-opus-4-6' }],
  icon: null,
};

describe('EndpointModelItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders aria-selected when it is told it is the current row', () => {
    render(<EndpointModelItem modelId="claude-opus-4-6" endpoint={baseEndpoint} isSelected />);
    expect(screen.getByRole('menuitem')).toHaveAttribute('aria-selected', 'true');
  });

  it('renders no aria-selected when it is not', () => {
    render(
      <EndpointModelItem modelId="claude-opus-4-6" endpoint={baseEndpoint} isSelected={false} />,
    );
    expect(screen.getByRole('menuitem')).not.toHaveAttribute('aria-selected');
  });

  /**
   * The rule that decides which row wears the mark. It moved out of the
   * component when selection became a prop, and on the way it lost two of its
   * three conditions — leaving `selected.model === modelId`, which puts a
   * second checkmark in the menu whenever a spec is active or two endpoints
   * happen to offer the same model id.
   */
  describe('isCurrent', () => {
    it('is the current row when endpoint and model match and no spec is active', () => {
      expect(
        isCurrent(baseEndpoint, 'claude-opus-4-6', {
          endpoint: 'anthropic',
          model: 'claude-opus-4-6',
          modelSpec: '',
        }),
      ).toBe(true);
    });

    it('yields to an active spec even when endpoint and model match', () => {
      expect(
        isCurrent(baseEndpoint, 'claude-opus-4-6', {
          endpoint: 'anthropic',
          model: 'claude-opus-4-6',
          modelSpec: 'my-anthropic-spec',
        }),
      ).toBe(false);
    });

    it('does not claim a matching model id under a different endpoint', () => {
      expect(
        isCurrent(baseEndpoint, 'claude-opus-4-6', {
          endpoint: 'openai',
          model: 'claude-opus-4-6',
          modelSpec: '',
        }),
      ).toBe(false);
    });

    it('does not claim a different model under a matching endpoint', () => {
      expect(
        isCurrent(baseEndpoint, 'claude-opus-4-6', {
          endpoint: 'anthropic',
          model: 'claude-sonnet-4-5',
          modelSpec: '',
        }),
      ).toBe(false);
    });
  });
});
