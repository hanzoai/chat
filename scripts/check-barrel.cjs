#!/usr/bin/env node
/**
 * Every name the server destructures from a workspace barrel must actually be
 * exported by that barrel's BUILT output.
 *
 * The outage this exists to prevent: `api/server/routes/skills.js` destructured
 * `createSkillsHandlers` from `@hanzochat/api`, but the barrel never re-exported
 * `skills/*`. CommonJS does not complain about a missing property — the name
 * simply arrives `undefined`, and the process died at the first call site with
 * `TypeError: createSkillsHandlers is not a function`. Nothing failed until
 * boot, in production.
 *
 * Static, cheap, and honest: read what the server asks for, compare it against
 * what `require()` really returns. Run after the packages are built (the
 * Dockerfile does exactly that) so a barrel that cannot satisfy its callers
 * fails the BUILD instead of the pod.
 */
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join, relative } = require('node:path');
const { createRequire } = require('node:module');

const ROOT = join(__dirname, '..');
// Resolve exactly as the server does: the workspace links live in
// api/node_modules/@hanzochat/*, not at the repo root.
const fromServer = createRequire(join(ROOT, 'api', 'package.json'));
/** Workspace barrels the server imports by package name. */
const BARRELS = ['@hanzochat/api', '@hanzochat/data-schemas', '@hanzochat/data-provider'];
/** Where the server code lives. */
const SOURCES = ['api'];

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '__tests__' || entry === 'test' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    // Tests mock their imports; only code that actually boots is evidence.
    else if (full.endsWith('.js') && !/\.(spec|test)\.js$/.test(full)) out.push(full);
  }
  return out;
};

/**
 * Names destructured from `require('<pkg>')`, including the multi-line form and
 * `{ a: b }` renames (the exported name is what matters). `...rest` is skipped —
 * it asserts nothing about a specific export.
 */
function required(source, pkg) {
  const names = new Set();
  const pattern = new RegExp(
    String.raw`(?:const|let|var)\s*\{([\s\S]*?)\}\s*=\s*require\(\s*['"]${pkg}['"]\s*\)`,
    'g',
  );
  for (const [, body] of source.matchAll(pattern)) {
    for (const part of body.split(',')) {
      const name = part.split(':')[0].trim().replace(/\/\/.*$/, '').trim();
      if (name && !name.startsWith('...') && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  return names;
}

const files = SOURCES.flatMap((dir) => walk(join(ROOT, dir)));
let missing = 0;

for (const pkg of BARRELS) {
  let barrel;
  try {
    barrel = fromServer(pkg);
  } catch (error) {
    console.error(`FAIL ${pkg} cannot be required at all:\n  ${error.message}`);
    missing += 1;
    continue;
  }
  const wanted = new Map(); // export name -> files that want it
  for (const file of files) {
    for (const name of required(readFileSync(file, 'utf8'), pkg)) {
      if (!wanted.has(name)) wanted.set(name, []);
      wanted.get(name).push(relative(ROOT, file));
    }
  }
  const absent = [...wanted.keys()].filter((name) => barrel[name] === undefined).sort();
  for (const name of absent) {
    console.error(`FAIL ${pkg} does not export ${name} — required by:`);
    for (const file of wanted.get(name)) console.error(`       ${file}`);
    missing += 1;
  }
  console.log(`${absent.length ? 'FAIL' : ' ok '} ${pkg}: ${wanted.size} names required, ${absent.length} missing`);
}

if (missing) {
  console.error(
    `\n${missing} unsatisfied import(s). The barrel must re-export what the server requires — ` +
      `a missing CommonJS export is silently \`undefined\` and only fails at the call site, in production.`,
  );
  process.exit(1);
}
