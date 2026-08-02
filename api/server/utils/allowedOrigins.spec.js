const { resolveAllowedOrigin, parseOrigins } = require('./allowedOrigins');

const FIRST_PARTY = ['https://hanzo.chat', 'https://chat.hanzo.ai'];

describe('the origin allowed to make a credentialed request', () => {
  test('an origin on the list is echoed back', () => {
    expect(resolveAllowedOrigin('https://hanzo.chat', FIRST_PARTY)).toBe('https://hanzo.chat');
    expect(resolveAllowedOrigin('https://chat.hanzo.ai', FIRST_PARTY)).toBe(
      'https://chat.hanzo.ai',
    );
  });

  test('an origin off the list gets no header at all', () => {
    // undefined, not false or '*': a browser discards a credentialed response
    // that carries no Access-Control-Allow-Origin, which is the outcome we want.
    expect(resolveAllowedOrigin('https://evil.example.com', FIRST_PARTY)).toBeUndefined();
  });

  test('a request with no Origin is not an allowed origin', () => {
    expect(resolveAllowedOrigin(undefined, FIRST_PARTY)).toBeUndefined();
    expect(resolveAllowedOrigin('', FIRST_PARTY)).toBeUndefined();
  });

  test('an empty list allows nothing', () => {
    expect(resolveAllowedOrigin('https://hanzo.chat', [])).toBeUndefined();
  });
});

describe('the subdomain wildcard that used to be here', () => {
  // The previous rule was /^https:\/\/([a-z0-9-]+\.)?(hanzo\.(ai|chat|...))$/
  // with credentials: true. Each case below MATCHED it and was granted a
  // credentialed read. They are the reason this is an exact list.

  test('an arbitrary subdomain of a domain we own is NOT first-party', () => {
    // Same registrable domain => same-site => SameSite=Lax does NOT withhold the
    // session cookie. One XSS on any hanzo.ai host would have read this app's
    // authenticated responses.
    expect(resolveAllowedOrigin('https://zzz-evil.hanzo.ai', FIRST_PARTY)).toBeUndefined();
    expect(resolveAllowedOrigin('https://anything.hanzo.chat', FIRST_PARTY)).toBeUndefined();
  });

  test('a customer-published site is never first-party', () => {
    // hanzo.app serves CUSTOMER content; a suffix rule cannot tell it from a console.
    expect(resolveAllowedOrigin('https://someslug.hanzo.app', FIRST_PARTY)).toBeUndefined();
  });

  test('a lookalike domain is refused', () => {
    expect(resolveAllowedOrigin('https://nothanzo.ai', FIRST_PARTY)).toBeUndefined();
    expect(resolveAllowedOrigin('https://hanzo.ai.evil.com', FIRST_PARTY)).toBeUndefined();
    expect(resolveAllowedOrigin('https://hanzo.chat.evil.com', FIRST_PARTY)).toBeUndefined();
  });

  test('scheme and port are part of the origin, so http is not https', () => {
    expect(resolveAllowedOrigin('http://hanzo.chat', FIRST_PARTY)).toBeUndefined();
    expect(resolveAllowedOrigin('https://hanzo.chat:8443', FIRST_PARTY)).toBeUndefined();
  });

  test('a trailing dot does not smuggle a listed origin past exact matching', () => {
    expect(resolveAllowedOrigin('https://hanzo.chat.', FIRST_PARTY)).toBeUndefined();
  });
});

describe('reading the list from configuration', () => {
  test('a comma-separated list is split and trimmed', () => {
    expect(parseOrigins(' https://a.example , https://b.example ')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  test('blank and missing configuration yield an empty list, not a wildcard', () => {
    expect(parseOrigins('')).toEqual([]);
    expect(parseOrigins(undefined)).toEqual([]);
    expect(parseOrigins(',, ,')).toEqual([]);
  });
});
