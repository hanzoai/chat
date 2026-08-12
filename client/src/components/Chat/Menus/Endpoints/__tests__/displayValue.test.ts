import type { Endpoint, SelectedValues } from '~/common';
import { getDisplayValue } from '../utils';
import { label } from '~/utils';

jest.mock('~/components/Chat/Menus/Endpoints/components/SpecIcon', () => ({
  __esModule: true,
  default: () => null,
}));

const localize = ((key: string) => key) as any;

const hanzo: Endpoint = {
  value: 'hanzo',
  label: 'Hanzo',
  hasModels: true,
  models: [{ name: 'zen5-flash' }, { name: 'enso' }],
  icon: null,
} as Endpoint;

const chip = (selected: Partial<SelectedValues>) =>
  getDisplayValue({
    localize,
    mappedEndpoints: [hanzo],
    modelSpecs: [],
    selectedValues: { endpoint: null, model: null, modelSpec: null, ...selected } as SelectedValues,
  });

/**
 * The chip names the model you are on; the menu below it names the same model
 * on a row. They read the SAME string, so they have to spell it the same way —
 * and they did not: production showed `zen5-flash` on the chip directly above
 * "Zen5 Flash" in the list. The menu had been taught the house names and the
 * chip had not.
 */
describe('getDisplayValue', () => {
  it('spells a house model the way the menu row does', () => {
    expect(chip({ endpoint: 'hanzo', model: 'zen5-flash' })).toBe('Zen5 Flash');
    expect(chip({ endpoint: 'hanzo', model: 'enso' })).toBe('Enso');
  });

  it('agrees with the menu for every model the endpoint offers', () => {
    // The property that matters, stated directly: one string, one spelling.
    for (const m of hanzo.models ?? []) {
      expect(chip({ endpoint: 'hanzo', model: m.name })).toBe(label(m.name));
    }
  });

  it('leaves a third-party id as its vendor writes it', () => {
    const openai = { ...hanzo, value: 'openai', label: 'OpenAI' } as Endpoint;
    expect(
      getDisplayValue({
        localize,
        mappedEndpoints: [openai],
        modelSpecs: [],
        selectedValues: { endpoint: 'openai', model: 'gpt-5.2', modelSpec: null } as SelectedValues,
      }),
    ).toBe('gpt-5.2');
  });

  it('still asks for a model when nothing is chosen', () => {
    expect(chip({})).toBe('com_ui_select_model');
  });
});
