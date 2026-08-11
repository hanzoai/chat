import { isEnso, label } from './house';

/**
 * ONE predicate, because the house endpoint serves TWO families.
 *
 * This lived privately inside MessageEndpointIcon, so the message avatar could
 * tell Enso from Zen and the model menu could not: the menu keyed on the
 * ENDPOINT, and Enso is a model ON the hanzo/zen endpoint, so every Enso row
 * wore Zen's open ring. The marks differ only by the gap, so the wrong one
 * renders one product wearing the other's identity.
 */
describe('isEnso', () => {
  it('claims the router family', () => {
    expect(isEnso('enso')).toBe(true);
    expect(isEnso('enso-flash')).toBe(true);
    expect(isEnso('enso-ultra')).toBe(true);
  });

  it('covers a future rung without another edit', () => {
    // Prefix match is the point: a new `enso-*` needs no change here.
    expect(isEnso('enso-nano')).toBe(true);
  });

  it('does not claim a model that merely CONTAINS enso', () => {
    // Anchored. Without this, an unrelated vendor model wearing the substring
    // would take Hanzo's mark.
    expect(isEnso('super-enso')).toBe(false);
    expect(isEnso('ensomble')).toBe(false);
  });

  it('leaves the Zen family to Zen', () => {
    expect(isEnso('zen')).toBe(false);
    expect(isEnso('zen-coder')).toBe(false);
  });

  it('is total — absent input is not Enso', () => {
    expect(isEnso(undefined)).toBe(false);
    expect(isEnso(null)).toBe(false);
    expect(isEnso('')).toBe(false);
  });

  it('tolerates the casing and padding a gateway id arrives with', () => {
    expect(isEnso('  Enso  ')).toBe(true);
    expect(isEnso('ENSO-ULTRA')).toBe(true);
  });
});

/**
 * The catalog serves ids and NO display name (verified against
 * api.hanzo.ai/v1/models: id, owned_by, pricing, context_window — no name), and
 * the model menu rendered `modelId` verbatim. So our own flagship sat in lower
 * case beside third-party models wearing their vendors' capitals.
 */
describe('label', () => {
  it('titles the house families', () => {
    expect(label('enso')).toBe('Enso');
    expect(label('enso-flash')).toBe('Enso Flash');
    expect(label('enso-ultra')).toBe('Enso Ultra');
    expect(label('zen5-coder')).toBe('Zen5 Coder');
    expect(label('zen3-omni')).toBe('Zen3 Omni');
  });

  it('keeps an initialism whole', () => {
    // `zen-vl` is Zen VL — vision-language — never "Zen Vl".
    expect(label('zen-vl')).toBe('Zen VL');
  });

  it('leaves a third-party id exactly as its vendor writes it', () => {
    // This is the half that matters most: title-casing these invents a name
    // nobody uses, and reads worse than the id.
    expect(label('gpt-5.2')).toBe('gpt-5.2');
    expect(label('claude-opus-4-5')).toBe('claude-opus-4-5');
    expect(label('deepseek-v4')).toBe('deepseek-v4');
  });

  it('does not claim a model that merely CONTAINS a house name', () => {
    expect(label('super-enso')).toBe('super-enso');
    expect(label('zenith')).toBe('zenith');
  });

  it('is total — absent input yields an empty string, never a crash', () => {
    expect(label(undefined)).toBe('');
    expect(label(null)).toBe('');
    expect(label('')).toBe('');
  });

  it('passes a human name through, so it is safe on an agent row', () => {
    // EndpointModelItem overwrites modelName with an agent/assistant name
    // before this runs; a name that is not a house id must survive untouched.
    expect(label('My Support Bot')).toBe('My Support Bot');
  });
});
