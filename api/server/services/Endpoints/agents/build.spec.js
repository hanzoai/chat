/**
 * Regression: when no agent is created/selected, the agents endpoint must resolve
 * to an ephemeral (ad-hoc, plain-model) agent so the user gets a reply — instead
 * of loadAgent returning null because agent_id was missing.
 *
 * Hermetic: mocks data-schemas (no winston) and ~/models/Agent (no MongoDB).
 */

jest.mock('@librechat/data-schemas', () => ({ logger: { error: jest.fn() } }));

jest.mock('librechat-data-provider', () => ({
  Constants: { EPHEMERAL_AGENT_ID: 'ephemeral' },
  isAgentsEndpoint: (endpoint) => endpoint === 'agents',
  removeNullishValues: (obj) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null)),
}));

const mockLoadAgent = jest.fn(() => Promise.resolve({ id: 'ephemeral', model: 'zen3-nano' }));
jest.mock('~/models/Agent', () => ({ loadAgent: mockLoadAgent }));

const { buildOptions } = require('./build');

const EPHEMERAL = 'ephemeral';

describe('agents buildOptions — missing agent_id resolves to ephemeral', () => {
  beforeEach(() => mockLoadAgent.mockClear());

  test('no agent_id on agents endpoint → loadAgent called with EPHEMERAL_AGENT_ID', async () => {
    const req = { body: {}, user: { id: 'u1' } };
    // parsedBody as built from "My Agents" with no agent selected (no agent_id).
    const options = buildOptions(req, 'agents', { model: 'zen3-nano' });
    await options.agent;

    expect(mockLoadAgent).toHaveBeenCalledTimes(1);
    expect(mockLoadAgent.mock.calls[0][0].agent_id).toBe(EPHEMERAL);
  });

  test('real agent_id on agents endpoint is passed through unchanged', async () => {
    const req = { body: {}, user: { id: 'u1' } };
    const options = buildOptions(req, 'agents', { model: 'zen3-nano', agent_id: 'agent_real_42' });
    await options.agent;

    expect(mockLoadAgent.mock.calls[0][0].agent_id).toBe('agent_real_42');
  });

  test('non-agents endpoint always resolves to ephemeral', async () => {
    const req = { body: {}, user: { id: 'u1' } };
    const options = buildOptions(req, 'openAI', { model: 'zen3-nano', agent_id: 'agent_real_42' });
    await options.agent;

    expect(mockLoadAgent.mock.calls[0][0].agent_id).toBe(EPHEMERAL);
  });
});
