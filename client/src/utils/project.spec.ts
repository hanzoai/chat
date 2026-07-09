import {
  PROJECT_PARAM,
  sanitizeSlug,
  resolveProjectSlug,
  persistProjectSlug,
  clearProjectSlug,
  appBuilderProjectUrl,
  consoleProjectUrl,
  projectOpener,
} from './project';

describe('project cross-surface link', () => {
  beforeEach(() => {
    try {
      sessionStorage.clear();
    } catch {
      /* jsdom always has sessionStorage */
    }
  });

  describe('sanitizeSlug', () => {
    it('accepts a valid org-unique slug', () => {
      expect(sanitizeSlug('my-app')).toBe('my-app');
      expect(sanitizeSlug('a')).toBe('a');
      expect(sanitizeSlug('  My-App  ')).toBe('my-app');
    });
    it('rejects traversal / injection / malformed values', () => {
      expect(sanitizeSlug('../evil')).toBe('');
      expect(sanitizeSlug('a/b')).toBe('');
      expect(sanitizeSlug('-lead')).toBe('');
      expect(sanitizeSlug('trail-')).toBe('');
      expect(sanitizeSlug('has space')).toBe('');
      expect(sanitizeSlug('')).toBe('');
      expect(sanitizeSlug(null)).toBe('');
    });
  });

  describe('resolveProjectSlug', () => {
    it('reads ?project= from the search string', () => {
      expect(resolveProjectSlug(`?${PROJECT_PARAM}=my-app`)).toBe('my-app');
    });
    it('ignores a hostile value', () => {
      expect(resolveProjectSlug(`?${PROJECT_PARAM}=..%2Fetc`)).toBe('');
    });
    it('falls back to the persisted scope when the URL has none', () => {
      persistProjectSlug(`?${PROJECT_PARAM}=persisted-app`);
      expect(resolveProjectSlug('')).toBe('persisted-app');
    });
    it('does not persist on a pure read', () => {
      resolveProjectSlug(`?${PROJECT_PARAM}=ephemeral`);
      expect(resolveProjectSlug('')).toBe('');
    });
  });

  describe('persistProjectSlug / clearProjectSlug', () => {
    it('persists a URL slug and survives a query-less navigation', () => {
      expect(persistProjectSlug(`?${PROJECT_PARAM}=keep-me`)).toBe('keep-me');
      expect(persistProjectSlug('')).toBe('keep-me');
      clearProjectSlug();
      expect(persistProjectSlug('')).toBe('');
    });
  });

  describe('deep-link builders', () => {
    it('builds the hanzo.app builder link', () => {
      expect(appBuilderProjectUrl('my-app')).toBe(
        'https://hanzo.app/dev?project=my-app',
      );
    });
    it('builds the console link', () => {
      expect(consoleProjectUrl('my-app')).toBe(
        'https://console.hanzo.ai/?project=my-app',
      );
    });
    it('opener names the project', () => {
      expect(projectOpener('my-app')).toContain('my-app');
    });
  });
});
