const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');
const { injectIcons, mountIcons } = require('./icons');

/* The shell's icon block, as `client/index.html` writes it: five links, two href
   shapes (`assets/…` and a root-absolute `/favicon.ico`), one of them an SVG the
   browser prefers over every raster size. */
const SHELL = [
  '<html><head>',
  '    <title>Hanzo Chat</title>',
  '    <link rel="icon" type="image/svg+xml" href="assets/logo.svg" />',
  '    <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="any" />',
  '    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32x32.png" />',
  '    <link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16x16.png" />',
  '    <link rel="apple-touch-icon" href="assets/apple-touch-icon-180x180.png" />',
  '</head><body></body></html>',
].join('\n');

describe('injectIcons', () => {
  let dist;

  beforeEach(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
  });

  afterEach(() => {
    fs.rmSync(dist, { recursive: true, force: true });
  });

  /** Give `org` a mark of each named basename. */
  const ship = (org, ...files) => {
    const dir = path.join(dist, 'assets', 'brand', org);
    fs.mkdirSync(dir, { recursive: true });
    files.forEach((f) => fs.writeFileSync(path.join(dir, f), 'x'));
  };

  /* hanzo.chat ships no directory of its own, and must therefore be untouched —
     the same per-key restraint iamConfig keeps. */
  it('leaves the shell alone when the org ships no marks', () => {
    expect(injectIcons(SHELL, dist, 'hanzo')).toBe(SHELL);
    expect(injectIcons(SHELL, dist, undefined)).toBe(SHELL);
  });

  it("points a link at the brand's copy of the same file", () => {
    ship('lux', 'favicon-32x32.png');
    expect(injectIcons(SHELL, dist, 'lux')).toContain(
      '<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/lux/favicon-32x32.png" />',
    );
  });

  /* The defect this exists to stop: an SVG the brand does not have is the mark
     Chrome actually shows, so leaving that link in place leaves Hanzo's logo on
     a Lux tab however many raster sizes sit under it. */
  it('removes a link whose file the brand does not ship', () => {
    ship('lux', 'favicon-32x32.png');
    const out = injectIcons(SHELL, dist, 'lux');
    expect(out).not.toContain('logo.svg');
    expect(out).not.toContain('favicon-16x16.png');
    expect(out).not.toContain('apple-touch-icon');
  });

  /* A root-absolute href maps by basename like any other, so `/favicon.ico`
     reaches the brand's directory rather than staying at the shared root. */
  it('rewrites a root-absolute href', () => {
    ship('lux', 'favicon.ico');
    expect(injectIcons(SHELL, dist, 'lux')).toContain('href="/assets/brand/lux/favicon.ico"');
  });

  it('leaves everything that is not an icon link', () => {
    ship('lux', 'favicon.ico');
    const out = injectIcons(SHELL, dist, 'lux');
    expect(out).toContain('<title>Hanzo Chat</title>');
    expect(out).toContain('<html><head>');
    expect(out).toContain('</head><body></body></html>');
  });

  /* The set Lux actually ships: four rasters and no SVG. */
  it('serves the full Lux set and nothing of Hanzo', () => {
    ship(
      'lux',
      'favicon.ico',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'apple-touch-icon-180x180.png',
    );
    const out = injectIcons(SHELL, dist, 'lux');
    expect(out.match(/<link[^>]*rel="(?:icon|apple-touch-icon)"/g)).toHaveLength(4);
    expect(out).not.toMatch(/href="assets\//);
    expect(out).not.toContain('logo.svg');
  });
});

/* The paths the shell cannot speak for. A browser fetches `/favicon.ico` at the
   document root whatever the links say, and the bundle renders
   `/assets/logo.svg` on the sign-in screen — so both were answered by the built
   client, i.e. by Hanzo, on every brand. */
describe('mountIcons', () => {
  let dist;

  beforeEach(() => {
    dist = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
  });

  afterEach(() => {
    fs.rmSync(dist, { recursive: true, force: true });
  });

  const ship = (org, files) => {
    const dir = path.join(dist, 'assets', 'brand', org);
    fs.mkdirSync(dir, { recursive: true });
    Object.entries(files).forEach(([name, body]) =>
      fs.writeFileSync(path.join(dir, name), body),
    );
  };

  /** The brand's marks in front of a built client that answers everything with
   *  Hanzo's — which is what `staticCache(paths.dist)` is in production. */
  const serve = (org) => {
    const app = express();
    mountIcons(app, dist, org);
    app.use((req, res) => res.status(200).send('HANZO'));
    return app;
  };

  /** What came back, whoever answered. A mark is served under its own binary
   *  content type (`image/x-icon`, `image/svg+xml`), which supertest does not
   *  decode into `.text` — so reading only `.text` reports `undefined` for the
   *  case these tests exist to prove. */
  const body = (res) => (res.text === undefined ? Buffer.from(res.body).toString() : res.text);

  it("serves the brand's own favicon at the document root", async () => {
    ship('lux', { 'favicon.ico': 'LUX' });
    const res = await request(serve('lux')).get('/favicon.ico');
    expect(res.status).toBe(200);
    expect(body(res)).toBe('LUX');
  });

  /* The whole defect, at the path that caused it: the shell's links were already
     correct and lux.chat still served Hanzo's bytes here, because a browser asks
     for this one without being told to. */
  it('does not fall through to the built mark', async () => {
    ship('lux', { 'favicon.ico': 'LUX' });
    const res = await request(serve('lux')).get('/favicon.ico');
    expect(body(res)).not.toBe('HANZO');
  });

  /* Same rule as `injectIcons`: a mark the brand does not ship is not served.
     Serving the file whose LINK was just removed would be two policies for one
     question, and it would put Hanzo's logo on Lux's sign-in screen. */
  it('refuses a rooted mark the brand does not ship', async () => {
    ship('lux', { 'favicon.ico': 'LUX' });
    const res = await request(serve('lux')).get('/assets/logo.svg');
    expect(res.status).toBe(404);
    expect(body(res)).not.toBe('HANZO');
  });

  it("serves a rooted mark the brand does ship", async () => {
    ship('lux', { 'favicon.ico': 'LUX', 'logo.svg': '<svg/>' });
    const res = await request(serve('lux')).get('/assets/logo.svg');
    expect(res.status).toBe(200);
    expect(body(res)).toBe('<svg/>');
  });

  /* hanzo.chat ships no directory, so it must not be intercepted at all — the
     built client answers exactly as it did before this existed. */
  it('leaves a brand with no directory alone', async () => {
    ship('lux', { 'favicon.ico': 'LUX' });
    for (const org of ['hanzo', undefined]) {
      const app = serve(org);
      expect(body(await request(app).get('/favicon.ico'))).toBe('HANZO');
      expect(body(await request(app).get('/assets/logo.svg'))).toBe('HANZO');
    }
  });

  /* Only the rooted marks are claimed. The brand's directory is not a general
     overlay on the built client, and the rewrite that finds a mark by basename
     must not escape these paths. */
  it('claims nothing but the rooted marks', async () => {
    ship('lux', { 'favicon.ico': 'LUX', 'favicon-32x32.png': 'LUX32' });
    const app = serve('lux');
    for (const url of ['/', '/c/new', '/favicon-32x32.png', '/assets/favicon-32x32.png']) {
      expect(body(await request(app).get(url))).toBe('HANZO');
    }
  });

  /* The link path keeps working: `Mark` renders `/assets/brand/<org>/…` directly
     and the shell's rewritten links point there too, so that prefix must still
     reach the built client rather than being shadowed by the rewrite above. */
  it('leaves the brand directory reachable at its own path', async () => {
    ship('lux', { 'favicon.ico': 'LUX' });
    const res = await request(serve('lux')).get('/assets/brand/lux/favicon.ico');
    expect(body(res)).toBe('HANZO');
  });
});
