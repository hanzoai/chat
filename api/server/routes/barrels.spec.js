const fs = require('fs');
const path = require('path');

/**
 * A route destructures from a barrel; a barrel that forgot a name hands back
 * `undefined`, and the process exits 1 at require time — before it listens.
 * hanzo.chat 502'd with zero endpoints three times in a row on that shape
 * (`createSkillsHandlers`, then `canAccessSkillResource`), and nothing else can
 * see it: the routes are CommonJS so `tsc` has no opinion, and a unit test that
 * mocks its imports proves nothing about the real barrel.
 *
 * So: read what every route destructures, and prove the barrel names it.
 * Statically — requiring these barrels for real would drag in mongoose and the
 * built `dist/`, and neither is what went wrong.
 */

const routesDir = __dirname;
const apiRoot = path.resolve(routesDir, '..', '..');
const packageSrc = path.resolve(apiRoot, '..', 'packages', 'api', 'src');

/** `const { a, b: c } = require('<module>');` — the only shape the routes use. */
const DESTRUCTURE = /const \{([^}]*)\} = require\('([^']+)'\);/g;

/** A CommonJS barrel's own `module.exports = { ... }`, plus its spreads. */
function commonjsExports(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) {
    return new Set();
  }
  seen.add(file);
  const source = fs.readFileSync(file, 'utf8');
  const names = new Set();
  const block = source.match(/module\.exports = \{([\s\S]*?)\};/);
  if (!block) {
    return names;
  }
  for (const entry of block[1].split(',')) {
    const name = entry.trim().split(':')[0].trim();
    if (!name || name.startsWith('//')) {
      continue;
    }
    if (name.startsWith('...')) {
      /* `...accessResources` — follow the local require it came from. */
      const alias = name.slice(3);
      const from = source.match(new RegExp(`const ${alias} = require\\('(\\.[^']+)'\\)`));
      if (from) {
        for (const inner of commonjsExports(resolveLocal(file, from[1]), seen)) {
          names.add(inner);
        }
      }
      continue;
    }
    names.add(name);
  }
  return names;
}

/** Everything the TypeScript package's barrel republishes, transitively. */
function packageExports(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) {
    return new Set();
  }
  seen.add(file);
  const source = fs.readFileSync(file, 'utf8');
  const names = new Set(
    [...source.matchAll(/^export (?:declare )?(?:async )?(?:function|const|class) (\w+)/gm)].map(
      (m) => m[1],
    ),
  );
  /* `export { a, default as b } from './c';` and plain `export { a };` */
  for (const [, block] of source.matchAll(/^export \{([^}]*)\}/gm)) {
    for (const entry of block.split(',')) {
      const name = entry.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) {
        names.add(name);
      }
    }
  }
  for (const [, target] of source.matchAll(/^export \*(?: type)? from '(\.[^']+)';/gm)) {
    for (const inner of packageExports(resolveLocal(file, target), seen)) {
      names.add(inner);
    }
  }
  return names;
}

function resolveLocal(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  return (
    ['.ts', '.js', '/index.ts', '/index.js']
      .map((suffix) => base + suffix)
      .find((candidate) => fs.existsSync(candidate)) ?? base
  );
}

/** The barrels a route may destructure from, and what each publishes. */
const barrels = {
  '@hanzochat/api': () => packageExports(path.join(packageSrc, 'index.ts')),
  '~/server/middleware': () => commonjsExports(path.join(apiRoot, 'server/middleware/index.js')),
};

const published = Object.fromEntries(
  Object.entries(barrels).map(([name, read]) => [name, read()]),
);

const routes = fs
  .readdirSync(routesDir)
  .filter((file) => file.endsWith('.js') && !file.includes('.test.') && !file.includes('.spec.'));

describe('every barrel names what the routes destructure', () => {
  it.each(routes)('%s', (route) => {
    const source = fs.readFileSync(path.join(routesDir, route), 'utf8');
    const missing = [];
    for (const [, block, module] of source.matchAll(DESTRUCTURE)) {
      const names = published[module];
      if (!names) {
        continue;
      }
      for (const entry of block.split(',')) {
        const name = entry.trim().split(':')[0].trim();
        if (name && !names.has(name)) {
          missing.push(`${name} (from ${module})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
