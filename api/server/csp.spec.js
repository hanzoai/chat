const { contentSecurityPolicy } = require('./csp');

const directive = (name) =>
  contentSecurityPolicy
    .split('; ')
    .find((d) => d.startsWith(`${name} `))
    ?.slice(name.length + 1);

describe('Content-Security-Policy', () => {
  it('lets the SPA reach IAM, or login never completes', () => {
    // Browser PKCE: discovery + POST /v1/iam/oauth/token happen from the page.
    expect(directive('connect-src')).toContain('https://hanzo.id');
  });

  it('keeps the origins the app actually talks to', () => {
    const connect = directive('connect-src');
    ["'self'", 'https://hanzo.app', 'https://*.hanzo.ai', 'wss://*.hanzo.chat'].forEach((origin) =>
      expect(connect).toContain(origin),
    );
  });

  it('allows same-origin framing only', () => {
    expect(directive('frame-ancestors')).toBe("'self'");
  });

  it('keeps the same-origin audio-unlock iframe working', () => {
    expect(directive('frame-src')).toContain("'self'");
  });

  it('frames the ambient backdrop player, from the YouTube origin only', () => {
    expect(directive('frame-src')).toContain('https://www.youtube.com');
  });

  /**
   * hanzo.id answers `frame-ancestors 'none'` + `X-Frame-Options: DENY`, so it can
   * never be framed and chat no longer tries — the iframe `signinSilent()` flow is
   * gone. Listing the origin here would grant a capability nothing uses.
   */
  it('does not frame IAM, which refuses to be framed anyway', () => {
    expect(directive('frame-src')).not.toContain('hanzo.id');
  });

  it('never opens the door to any origin', () => {
    expect(contentSecurityPolicy).not.toContain('*;');
    expect(directive('connect-src')).not.toContain(' * ');
  });
});
