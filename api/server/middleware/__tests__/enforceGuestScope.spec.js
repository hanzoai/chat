jest.mock('@librechat/data-schemas', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

jest.mock('librechat-data-provider', () => ({
  EModelEndpoint: { custom: 'custom', agents: 'agents' },
}));

jest.mock('~/server/services/guestConfig', () => ({
  getGuestConfig: jest.fn(),
}));

const { getGuestConfig } = require('~/server/services/guestConfig');
const enforceGuestScope = require('../enforceGuestScope');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });

describe('enforceGuestScope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getGuestConfig.mockReturnValue({
      enabled: true,
      endpoint: 'Hanzo',
      model: 'zen3-nano',
      messageMax: 3,
    });
  });

  it('passes non-guest requests through untouched', () => {
    const req = { user: { id: 'u1', role: 'USER' }, body: { endpoint: 'OpenAI', model: 'gpt-4o' } };
    const next = jest.fn();
    enforceGuestScope(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body.endpoint).toBe('OpenAI');
    expect(req.body.model).toBe('gpt-4o');
  });

  it('rejects a guest naming a different endpoint (403)', () => {
    const req = { user: { id: 'g1', guest: true }, body: { endpoint: 'OpenAI' } };
    const res = mockRes();
    const next = jest.fn();
    enforceGuestScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a guest naming a different (paid) model (403)', () => {
    const req = { user: { id: 'g1', guest: true }, body: { endpoint: 'Hanzo', model: 'zen4-max' } };
    const res = mockRes();
    const next = jest.fn();
    enforceGuestScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('pins endpoint, type, and model for a compliant guest request', () => {
    const req = {
      user: { id: 'g1', guest: true },
      body: { endpoint: 'Hanzo', model: 'zen3-nano', text: 'hi' },
    };
    const next = jest.fn();
    enforceGuestScope(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body.endpoint).toBe('Hanzo');
    expect(req.body.endpointType).toBe('custom');
    expect(req.body.model).toBe('zen3-nano');
  });

  it('pins endpoint/model even when the guest omits them', () => {
    const req = { user: { id: 'g1', guest: true }, body: { text: 'hi' } };
    const next = jest.fn();
    enforceGuestScope(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body.endpoint).toBe('Hanzo');
    expect(req.body.model).toBe('zen3-nano');
  });

  it('strips every privileged capability from a guest request', () => {
    const req = {
      user: { id: 'g1', guest: true },
      body: {
        endpoint: 'Hanzo',
        model: 'zen3-nano',
        agent_id: 'agent_evil',
        spec: 'paid-spec',
        preset: { foo: 'bar' },
        files: [{ file_id: 'f1' }],
        tools: ['execute_code'],
        tool_resources: { x: 1 },
        resendFiles: true,
        promptPrefix: 'jailbreak',
        web_search: true,
      },
    };
    const next = jest.fn();
    enforceGuestScope(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body.agent_id).toBeUndefined();
    expect(req.body.spec).toBeUndefined();
    expect(req.body.preset).toBeUndefined();
    expect(req.body.files).toBeUndefined();
    expect(req.body.tools).toBeUndefined();
    expect(req.body.tool_resources).toBeUndefined();
    expect(req.body.resendFiles).toBeUndefined();
    expect(req.body.promptPrefix).toBeUndefined();
    expect(req.body.web_search).toBeUndefined();
  });

  it('returns 404 for a guest when guest chat is disabled mid-flight', () => {
    getGuestConfig.mockReturnValue({ enabled: false, endpoint: 'Hanzo', model: 'zen3-nano' });
    const req = { user: { id: 'g1', guest: true }, body: {} };
    const res = mockRes();
    const next = jest.fn();
    enforceGuestScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});
