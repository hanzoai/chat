import { HANZO_GIT_HOST, HANZO_GIT_URL, HANZO_GIT_URL_PATTERN, isHanzoGitUrl } from './git';

describe('Hanzo Git', () => {
  it('names the canonical host and base url', () => {
    expect(HANZO_GIT_HOST).toBe('git.hanzo.ai');
    expect(HANZO_GIT_URL).toBe('https://git.hanzo.ai/');
  });

  it('accepts repositories served by git.hanzo.ai', () => {
    expect(isHanzoGitUrl('https://git.hanzo.ai/acme/todo')).toBe(true);
    expect(isHanzoGitUrl('https://git.hanzo.ai/acme/todo.git')).toBe(true);
    expect(isHanzoGitUrl('http://git.hanzo.ai/acme/todo')).toBe(true);
    // exact host is case-insensitive
    expect(isHanzoGitUrl('https://GIT.HANZO.AI/acme/todo')).toBe(true);
  });

  it('rejects empty and unparseable input', () => {
    expect(isHanzoGitUrl(undefined)).toBe(false);
    expect(isHanzoGitUrl(null)).toBe(false);
    expect(isHanzoGitUrl('')).toBe(false);
    expect(isHanzoGitUrl('not a url')).toBe(false);
  });

  it('rejects look-alike and non-Hanzo hosts (exact host match only)', () => {
    expect(isHanzoGitUrl('https://git.hanzo.ai.evil.com/acme/todo')).toBe(false);
    expect(isHanzoGitUrl('https://evil.com/git.hanzo.ai')).toBe(false);
    expect(isHanzoGitUrl('https://github.com/acme/todo')).toBe(false);
    expect(isHanzoGitUrl('https://notgit.hanzo.ai/acme/todo')).toBe(false);
  });

  it('rejects non-http(s) schemes even on the right host', () => {
    expect(isHanzoGitUrl('ssh://git.hanzo.ai/acme/todo')).toBe(false);
    expect(isHanzoGitUrl('javascript:alert(1)//git.hanzo.ai')).toBe(false);
  });

  it('server pattern (used case-insensitively) agrees with the client predicate', () => {
    expect(HANZO_GIT_URL_PATTERN).toBe('^https?://git\\.hanzo\\.ai/');
    // The server applies it with the `i` option; the client parses the URL.
    const serverAccepts = (url: string) => new RegExp(HANZO_GIT_URL_PATTERN, 'i').test(url);

    for (const url of [
      'https://git.hanzo.ai/acme/todo',
      'https://git.hanzo.ai/acme/todo.git',
      'http://git.hanzo.ai/acme/todo',
      'https://GIT.HANZO.AI/acme/todo',
    ]) {
      expect(serverAccepts(url)).toBe(true);
      expect(isHanzoGitUrl(url)).toBe(true);
    }

    for (const url of [
      'https://git.hanzo.ai.evil.com/acme/todo',
      'https://evil.com/git.hanzo.ai',
      'https://github.com/acme/todo',
      'https://notgit.hanzo.ai/acme/todo',
      'ssh://git.hanzo.ai/acme/todo',
    ]) {
      expect(serverAccepts(url)).toBe(false);
      expect(isHanzoGitUrl(url)).toBe(false);
    }
  });
});
