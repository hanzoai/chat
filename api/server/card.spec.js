const { injectCard } = require('./card');

/** The shell as the build leaves it, reduced to what the card reads. */
const shell = (icon = 'assets/apple-touch-icon-180x180.png') => `<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta name="description" content="AI chat platform with support for multiple AI models" />
    <title>Hanzo Chat</title>
    <link rel="apple-touch-icon" href="${icon}" />
  </head>
  <body></body>
</html>`;

/** What a crawler would read off the result. */
const card = (html) =>
  Object.fromEntries(
    [...html.matchAll(/<meta (?:property|name)="((?:og|twitter):[^"]+)" content="([^"]*)"/g)].map(
      (m) => [m[1], m[2]],
    ),
  );

describe('the shell carries a social card', () => {
  it('names THIS deployment, not the brand that built the image', () => {
    const got = card(injectCard(shell(), 'Lux Chat', 'https://lux.chat'));
    expect(got['og:site_name']).toBe('Lux Chat');
    expect(got['og:title']).toBe('Lux Chat');
    expect(got['twitter:title']).toBe('Lux Chat');
    expect(got['og:url']).toBe('https://lux.chat');
  });

  it('restates the shell description rather than carrying a second copy', () => {
    const got = card(injectCard(shell(), 'Hanzo Chat', 'https://hanzo.chat'));
    const text = 'AI chat platform with support for multiple AI models';
    expect(got['og:description']).toBe(text);
    expect(got['twitter:description']).toBe(text);
  });

  it('shows the mark injectIcons already chose, made absolute', () => {
    // A brand's rewritten mark — the card must follow it rather than resolve
    // the question a second time.
    const html = injectCard(shell('/assets/brand/lux/apple-touch-icon-180x180.png'), 'Lux Chat', 'https://lux.chat');
    expect(card(html)['og:image']).toBe('https://lux.chat/assets/brand/lux/apple-touch-icon-180x180.png');
  });

  it('claims the small card, because a square mark is what ships', () => {
    expect(card(injectCard(shell(), 'Hanzo Chat', 'https://hanzo.chat'))['twitter:card']).toBe(
      'summary',
    );
  });

  it('offers no image rather than a relative one nothing can resolve', () => {
    const got = card(injectCard(shell(), 'Hanzo Chat', undefined));
    expect(got['og:image']).toBeUndefined();
    expect(got['og:url']).toBeUndefined();
    expect(got['og:title']).toBe('Hanzo Chat');
  });

  it('leaves a shell with no name exactly as it found it', () => {
    expect(injectCard(shell(), undefined, 'https://hanzo.chat')).toBe(shell());
  });

  it('escapes a name that would otherwise close the attribute', () => {
    const html = injectCard(shell(), 'A "quoted" & <brand>', 'https://hanzo.chat');
    expect(html).toContain('content="A &quot;quoted&quot; &amp; &lt;brand>"');
    expect(card(html)['og:title']).toBe('A &quot;quoted&quot; &amp; &lt;brand>');
  });

  it('puts the card inside the head', () => {
    const html = injectCard(shell(), 'Hanzo Chat', 'https://hanzo.chat');
    expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('</head>'));
  });
});
