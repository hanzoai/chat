import { LocalStorageKeys } from '@hanzochat/data-provider';
import { appName, documentName, learnAppName, nameDocument } from './documentName';

/**
 * The rules six scattered `document.title` assignments used to disagree about.
 * Each case below is one of them, as it behaved before.
 */
describe('documentName', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = 'index.html said this';
  });

  it('names the app beside the conversation', () => {
    learnAppName('Hanzo Chat');
    expect(documentName('Refactoring the auth module')).toBe(
      'Refactoring the auth module — Hanzo Chat',
    );
  });

  it('falls back to the app when there is no conversation', () => {
    learnAppName('Hanzo Chat');
    expect(documentName()).toBe('Hanzo Chat');
    expect(documentName('')).toBe('Hanzo Chat');
    expect(documentName('   ')).toBe('Hanzo Chat');
  });

  it('never returns a bare conversation title once the app is known', () => {
    // Three call sites did exactly that, so a tab read only the conversation
    // and named no app at all.
    learnAppName('Hanzo Chat');
    expect(documentName('Some chat')).toContain('Hanzo Chat');
  });

  it('takes an explicit app name, for a visitor who never signed in', () => {
    // The share view holds the config directly and its reader may have nothing
    // in localStorage.
    expect(documentName('A shared chat', 'Other Brand')).toBe('A shared chat — Other Brand');
  });

  it('hardcodes no brand — this app white-labels', () => {
    // `Startup.tsx` fell back to the literal 'Hanzo Chat', which printed
    // Hanzo's name on every other brand's login screen while config loaded.
    expect(documentName('A chat')).toBe('A chat');
    expect(documentName()).toBe('');
  });
});

describe('nameDocument', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = 'index.html said this';
  });

  it('never blanks the tab', () => {
    // `SearchButtons` assigned `cachedConvo?.title ?? ''` straight through, and
    // a browser handed an empty <title> shows the raw URL instead — so the tab
    // most in need of a name got the least readable one available.
    nameDocument('');
    expect(document.title).toBe('index.html said this');
    nameDocument(null);
    expect(document.title).toBe('index.html said this');
  });

  it('writes the composed name when there is one', () => {
    learnAppName('Hanzo Chat');
    nameDocument('Deploying the gateway');
    expect(document.title).toBe('Deploying the gateway — Hanzo Chat');
  });
});

describe('learnAppName', () => {
  beforeEach(() => localStorage.clear());

  it('remembers a name', () => {
    learnAppName('Hanzo Chat');
    expect(localStorage.getItem(LocalStorageKeys.APP_TITLE)).toBe('Hanzo Chat');
    expect(appName()).toBe('Hanzo Chat');
  });

  it('ignores an absent one rather than erasing what it knows', () => {
    // Config can arrive late or empty; forgetting the brand because one poll
    // came back thin is worse than keeping the last good answer.
    learnAppName('Hanzo Chat');
    learnAppName(undefined);
    learnAppName('');
    learnAppName('   ');
    expect(appName()).toBe('Hanzo Chat');
  });
});
