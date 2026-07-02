import { parseAgentCommand, isAgentCommandPrefix } from './agentCommand';

describe('parseAgentCommand', () => {
  it('parses name only', () => {
    expect(parseAgentCommand('/agent researcher')).toEqual({
      name: 'researcher',
      prompt: '',
    });
  });

  it('parses name + prompt', () => {
    expect(parseAgentCommand('/agent researcher summarize Q3 sales')).toEqual({
      name: 'researcher',
      prompt: 'summarize Q3 sales',
    });
  });

  it('accepts the /agents alias', () => {
    expect(parseAgentCommand('/agents planner draft the plan')).toEqual({
      name: 'planner',
      prompt: 'draft the plan',
    });
  });

  it('trims surrounding whitespace and preserves multiline prompts', () => {
    expect(parseAgentCommand('  /agent bot  line1\nline2  ')).toEqual({
      name: 'bot',
      prompt: 'line1\nline2',
    });
  });

  it('returns null for non-commands', () => {
    expect(parseAgentCommand('hello world')).toBeNull();
    expect(parseAgentCommand('/prompt something')).toBeNull();
    expect(parseAgentCommand('/agent')).toBeNull(); // no name
    expect(parseAgentCommand('/agentx foo')).toBeNull(); // must be word-bounded
    expect(parseAgentCommand('')).toBeNull();
  });

  it('does not treat a message merely mentioning /agent mid-text as a command', () => {
    expect(parseAgentCommand('please run /agent researcher')).toBeNull();
  });
});

describe('isAgentCommandPrefix', () => {
  it('is true once /agent is begun', () => {
    expect(isAgentCommandPrefix('/agent')).toBe(true);
    expect(isAgentCommandPrefix('/agent ')).toBe(true);
    expect(isAgentCommandPrefix('/agents re')).toBe(true);
  });

  it('is false for other slash commands or plain text', () => {
    expect(isAgentCommandPrefix('/')).toBe(false);
    expect(isAgentCommandPrefix('/agentx')).toBe(false);
    expect(isAgentCommandPrefix('hello')).toBe(false);
  });
});
