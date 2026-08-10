const { iamConfig, injectIamConfig } = require('./iamConfig');

const HTML = '<html><head><title>t</title></head><body><script type="module" src="/a.js"></script></body></html>';

describe('iamConfig', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.OPENID_ISSUER;
    delete process.env.OPENID_CLIENT_ID;
    delete process.env.OPENID_ORG;
  });

  afterAll(() => {
    process.env = saved;
  });

  /* The whole point of the per-key shape: a deployment that states nothing must
     behave exactly as it did before this existed, so the compiled defaults in
     the bundle stay in charge. */
  it('states nothing when the environment states nothing', () => {
    expect(iamConfig()).toBeNull();
    expect(injectIamConfig(HTML)).toBe(HTML);
  });

  it('omits a key rather than emitting it empty', () => {
    process.env.OPENID_ISSUER = 'https://lux.id';
    expect(iamConfig()).toEqual({ serverUrl: 'https://lux.id' });
  });

  it('reads the same variables the backend strategy registers with', () => {
    process.env.OPENID_ISSUER = 'https://lux.id';
    process.env.OPENID_CLIENT_ID = 'lux-chat';
    process.env.OPENID_ORG = 'lux';
    expect(iamConfig()).toEqual({
      serverUrl: 'https://lux.id',
      clientId: 'lux-chat',
      organization: 'lux',
    });
  });

  /* Ahead of the module scripts, which are declared in <body>. OAuthCallback
     reads this before any config request exists, so it cannot be a fetch. */
  it('injects ahead of the module scripts', () => {
    process.env.OPENID_ISSUER = 'https://lux.id';
    const out = injectIamConfig(HTML);
    expect(out.indexOf('__HANZO_IAM__')).toBeLessThan(out.indexOf('type="module"'));
    expect(out).toContain('</script></head>');
  });

  it('cannot close its own script element', () => {
    process.env.OPENID_CLIENT_ID = 'x</script><script>alert(1)';
    const out = injectIamConfig(HTML);
    expect(out).not.toContain('x</script>');
    expect(out).toContain('\\u003c/script');
  });

  it('still delivers the config when there is no head to anchor to', () => {
    process.env.OPENID_ISSUER = 'https://lux.id';
    expect(injectIamConfig('<body>x</body>')).toContain('__HANZO_IAM__');
  });
});
