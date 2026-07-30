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

  /**
   * `connect-src` is not enough, and believing it was is what made silent SSO inert.
   * `signinSilent()` does prompt=none in a HIDDEN IFRAME, so it is governed by
   * `frame-src` — absent, the policy fell back to `default-src 'self'` and every
   * silent re-auth died with "Framing 'https://hanzo.id/' violates … default-src
   * 'self'". A signed-in customer then rendered as anonymous and got a 2-message
   * guest trial instead of their own funded session.
   */
  it('lets the page FRAME IAM, or silent SSO cannot run', () => {
    expect(directive('frame-src')).toContain('https://hanzo.id');
  });

  it('keeps the same-origin audio-unlock iframe working', () => {
    expect(directive('frame-src')).toContain("'self'");
  });

  /**
   * The asymmetry is the security story: we may frame our own IdP, nothing may
   * frame us. A change that widened frame-ancestors would be a clickjacking hole,
   * so the two are asserted together.
   */
  it('widening frame-src does not widen frame-ancestors', () => {
    expect(directive('frame-src')).toContain('https://hanzo.id');
    expect(directive('frame-ancestors')).not.toContain('hanzo.id');
  });

  it('never opens the door to any origin', () => {
    expect(contentSecurityPolicy).not.toContain('*;');
    expect(directive('connect-src')).not.toContain(' * ');
  });
});
