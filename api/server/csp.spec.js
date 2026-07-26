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

  it('never opens the door to any origin', () => {
    expect(contentSecurityPolicy).not.toContain('*;');
    expect(directive('connect-src')).not.toContain(' * ');
  });
});
