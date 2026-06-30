/**
 * Regression: a logged-in user in "My Agents" with no agent created/selected
 * could type "hi" and get `400 {message:'agent_id is required in request body'}`.
 *
 * A missing agent_id on the agents endpoint is an ad-hoc (ephemeral) chat, not an
 * error. This hermetic test locks the access-middleware fix point (no MongoDB /
 * winston): canAccessAgentFromBody skips the per-agent ACL and calls next().
 * The downstream build-options fix point is covered by
 * ../../services/Endpoints/agents/build.spec.js.
 */

// Mock externals so neither winston (data-schemas) nor MongoDB (~/models/Agent) load.
jest.mock('@librechat/data-schemas', () => ({ logger: { error: jest.fn(), debug: jest.fn() } }));

jest.mock('librechat-data-provider', () => ({
  Constants: { EPHEMERAL_AGENT_ID: 'ephemeral' },
  ResourceType: { AGENT: 'agent' },
  // Real predicate semantics (mirrors packages/data-provider/src):
  isAgentsEndpoint: (endpoint) => endpoint === 'agents',
  isEphemeralAgentId: (agentId) => !agentId?.startsWith?.('agent_'),
}));

const mockCanAccessResource = jest.fn(() => (req, res, next) => {
  req.__aclChecked = true;
  return next();
});
jest.mock('./canAccessResource', () => ({ canAccessResource: mockCanAccessResource }));

jest.mock('~/models/Agent', () => ({ getAgent: jest.fn() }));

const { canAccessAgentFromBody } = require('./canAccessAgentFromBody');

const makeReqRes = (body) => {
  const req = { body, params: {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('agent_id missing → ephemeral fallback (no 400)', () => {
  const mw = canAccessAgentFromBody({ requiredPermission: 1 });

  test('agents endpoint with NO agent_id proceeds without a 400', async () => {
    const { req, res, next } = makeReqRes({ endpoint: 'agents', text: 'hi' });
    await mw(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockCanAccessResource).not.toHaveBeenCalled(); // no per-agent ACL for ephemeral
  });

  test('non-agents endpoint with no agent_id proceeds (ephemeral)', async () => {
    const { req, res, next } = makeReqRes({ endpoint: 'openAI', text: 'hi' });
    await mw(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('explicit ephemeral id proceeds', async () => {
    const { req, res, next } = makeReqRes({ endpoint: 'agents', agent_id: 'ephemeral_primary' });
    await mw(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('a real agent_id still runs the per-agent ACL check', async () => {
    const { req, res, next } = makeReqRes({ endpoint: 'agents', agent_id: 'agent_abc123' });
    await mw(req, res, next);

    // The middleware builds the ACL check with the real agent id as resourceIdParam,
    // then runs it (which here calls next via the mock).
    expect(mockCanAccessResource).toHaveBeenCalledTimes(1);
    expect(mockCanAccessResource.mock.calls[0][0]).toMatchObject({ resourceType: 'agent' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
