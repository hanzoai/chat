import {
  buildAppUrl,
  parseBuildCommand,
  isBuildCommandPrefix,
  HANZO_APP_BUILDER_URL,
} from './buildApp';

describe('buildAppUrl', () => {
  it('omits the prompt param when empty', () => {
    expect(buildAppUrl('')).toBe(HANZO_APP_BUILDER_URL);
    expect(buildAppUrl('   ')).toBe(HANZO_APP_BUILDER_URL);
    expect(buildAppUrl()).toBe(HANZO_APP_BUILDER_URL);
  });

  it('encodes the prompt into ?prompt=', () => {
    expect(buildAppUrl('a todo app')).toBe(`${HANZO_APP_BUILDER_URL}?prompt=a%20todo%20app`);
    expect(buildAppUrl('me & you?')).toBe(`${HANZO_APP_BUILDER_URL}?prompt=me%20%26%20you%3F`);
  });

  it('trims surrounding whitespace before encoding', () => {
    expect(buildAppUrl('  hello  ')).toBe(`${HANZO_APP_BUILDER_URL}?prompt=hello`);
  });
});

describe('parseBuildCommand', () => {
  it('parses the bare command to an empty prompt', () => {
    expect(parseBuildCommand('/build')).toBe('');
    expect(parseBuildCommand('  /build  ')).toBe('');
  });

  it('parses the command with a prompt', () => {
    expect(parseBuildCommand('/build make a todo app')).toBe('make a todo app');
  });

  it('trims surrounding whitespace and preserves multiline prompts', () => {
    expect(parseBuildCommand('  /build  line1\nline2  ')).toBe('line1\nline2');
  });

  it('returns null for non-commands', () => {
    expect(parseBuildCommand('hello world')).toBeNull();
    expect(parseBuildCommand('/agent foo')).toBeNull();
    expect(parseBuildCommand('/buildx foo')).toBeNull(); // must be word-bounded
    expect(parseBuildCommand('please /build a thing')).toBeNull(); // not at start
    expect(parseBuildCommand('')).toBeNull();
  });
});

describe('isBuildCommandPrefix', () => {
  it('is true once /build is begun', () => {
    expect(isBuildCommandPrefix('/build')).toBe(true);
    expect(isBuildCommandPrefix('/build ')).toBe(true);
    expect(isBuildCommandPrefix('/build a todo app')).toBe(true);
  });

  it('is false for other slash commands or plain text', () => {
    expect(isBuildCommandPrefix('/')).toBe(false);
    expect(isBuildCommandPrefix('/buildx')).toBe(false);
    expect(isBuildCommandPrefix('/agent')).toBe(false);
    expect(isBuildCommandPrefix('hello')).toBe(false);
  });
});
