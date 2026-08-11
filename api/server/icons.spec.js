const fs = require('fs');
const os = require('os');
const path = require('path');
const { injectIcons } = require('./icons');

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
