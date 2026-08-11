import { isEnso } from './enso';

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
