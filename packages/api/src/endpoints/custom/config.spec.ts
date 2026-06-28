import { EModelEndpoint } from 'librechat-data-provider';
import type { TCustomEndpoints, TEndpoint } from 'librechat-data-provider';
import { loadCustomEndpointsConfig } from './config';

/** Minimal valid custom endpoint (passes loadCustomEndpointsConfig's filter). */
const baseEndpoint = (over: Partial<TEndpoint> = {}): TEndpoint =>
  ({
    name: 'Hanzo',
    apiKey: 'sk-test',
    baseURL: 'https://api.hanzo.ai/v1',
    models: { default: ['zen5-mini'], fetch: false },
    ...over,
  }) as TEndpoint;

describe('loadCustomEndpointsConfig', () => {
  it('returns undefined when no custom endpoints are configured', () => {
    expect(loadCustomEndpointsConfig(undefined)).toBeUndefined();
  });

  it('propagates `customOrder` to `order` so the endpoint can outrank built-ins', () => {
    // order 0 beats the built-in `agents` endpoint (order 1), making Hanzo the
    // default for a new conversation instead of bare-`agents` (which 400s).
    const config = loadCustomEndpointsConfig([baseEndpoint({ customOrder: 0 })] as TCustomEndpoints);
    expect(config?.Hanzo).toBeDefined();
    expect(config?.Hanzo?.order).toBe(0);
    expect(config?.Hanzo?.type).toBe(EModelEndpoint.custom);
  });

  it('omits `order` when `customOrder` is not set (keeps the downstream 9999 default)', () => {
    const config = loadCustomEndpointsConfig([baseEndpoint()] as TCustomEndpoints);
    expect(config?.Hanzo).toBeDefined();
    expect(config?.Hanzo && 'order' in config.Hanzo).toBe(false);
  });

  it('keeps the configured endpoint name and carries display fields through', () => {
    const config = loadCustomEndpointsConfig([
      baseEndpoint({ customOrder: 2, modelDisplayLabel: 'Hanzo', iconURL: 'https://x/y.svg' }),
    ] as TCustomEndpoints);
    expect(config?.Hanzo?.order).toBe(2);
    expect(config?.Hanzo?.modelDisplayLabel).toBe('Hanzo');
    expect(config?.Hanzo?.iconURL).toBe('https://x/y.svg');
  });
});
