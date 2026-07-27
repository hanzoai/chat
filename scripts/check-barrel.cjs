#!/usr/bin/env node
/**
 * Two invariants that decide whether the server can finish `require()`.
 *
 * Between v1.0.20 and v1.0.30 the same defect shipped five times wearing four
 * faces — `createSkillsHandlers is not a function`, `Cannot find module
 * 'jszip'`, `Could not load the "sharp" module`, `canAccessSkillResource is not
 * a function`. Each fix surfaced the next one because they were symptoms of two
 * causes, neither of which anything checked:
 *
 *  1. EXTERNALIZABLE — rollup's `external` list for @hanzochat/api is built from
 *     that package's OWN declared deps. An import it never declared is not
 *     external, so rollup INLINES it. Inlining a module with a native or dynamic
 *     require (sharp, jszip) produces a bundle that throws at load. Declaring
 *     the import is what makes rollup leave it alone.
 *
 *  2. PUBLISHED — `api/server/**` is CommonJS and destructures from the barrel.
 *     A name the barrel does not export is not an error, it is `undefined`, and
 *     it stays undefined until the first call site touches it — at boot, in
 *     production. tsc cannot see it: the requiring side has no types.
 *
 * Both checks are static. Neither loads the dependency graph — an earlier
 * version `require()`d the barrel, which coupled it to every transitive package
 * and drowned one true finding in false ones.
 */
const { readFileSync, readdirSync, statSync, existsSync } = require('node:fs');
const { join, relative, dirname, normalize } = require('node:path');

const ROOT = join(__dirname, '..');
const API = join(ROOT, 'packages', 'api');
const SRC = join(API, 'src');
const BARREL = '@hanzochat/api';
const DIST = join(API, 'dist', 'index.js');

const NODE_BUILTINS = new Set([
  'assert','buffer','child_process','constants','crypto','dns','events','fs','http','https',
  'module','net','os','path','perf_hooks','process','querystring','readline','stream',
  'string_decoder','timers','tls','tty','url','util','vm','worker_threads','zlib',
]);

/**
 * Strip comments and template literals before scanning. `prompts/artifacts`
 * embeds example code in backticks telling the MODEL it may `import { useState }
 * from 'react'` — prose, not an import. Reading it as one is how a checker earns
 * its reputation for crying wolf.
 */
function source(file) {
  return readFileSync(file, 'utf8')
    .replace(/`(?:[^`\\]|\\[\s\S])*`/g, '``')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const isTest = (f) => /\.(spec|test)\.[cm]?[jt]sx?$/.test(f) || f.includes('__tests__');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const packageOf = (spec) =>
  spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];

// ── 1. EXTERNALIZABLE ───────────────────────────────────────────────────────
// Walk the module graph rollup actually bundles — everything reachable from
// src/index.ts — and require that each bare VALUE import is declared. Type-only
// imports are erased before rollup sees them, so they cannot be inlined.
const STATEMENT =
  /(?:^|\n)\s*(import|export)\s+([\s\S]*?)\bfrom\s*['"]([^'"]+)['"]|(?:^|[^\w.$])require\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveLocal(fromFile, spec) {
  const base = spec.startsWith('~/')
    ? join(SRC, spec.slice(2))
    : normalize(join(dirname(fromFile), spec));
  for (const ext of ['.ts', '.tsx', '.js', '/index.ts', '/index.tsx', '/index.js']) {
    if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext;
  }
  return existsSync(base) && statSync(base).isFile() ? base : null;
}

function reachableImports() {
  const entry = join(SRC, 'index.ts');
  const seen = new Set([entry]);
  const queue = [entry];
  const bare = new Map(); // package -> files importing it as a value
  while (queue.length) {
    const file = queue.pop();
    for (const m of source(file).matchAll(STATEMENT)) {
      const spec = m[3] ?? m[4];
      if (!spec) continue;
      if (spec.startsWith('.') || spec.startsWith('~')) {
        const next = resolveLocal(file, spec);
        if (next && !seen.has(next) && !isTest(next)) {
          seen.add(next);
          queue.push(next);
        }
        continue;
      }
      // `import type {...} from` / `export type {...} from` never reach rollup.
      if (m[1] && /^\s*type\b/.test(m[2] ?? '')) continue;
      const pkg = packageOf(spec);
      if (pkg.startsWith('node:') || NODE_BUILTINS.has(pkg) || !pkg) continue;
      if (!bare.has(pkg)) bare.set(pkg, new Set());
      bare.get(pkg).add(relative(ROOT, file));
    }
  }
  return { modules: seen.size, bare };
}

// ── 2. PUBLISHED ────────────────────────────────────────────────────────────
// `const { a, b } = require('@hanzochat/api')`. The body is [^{}] so the match
// cannot run past its own closing brace into the NEXT destructure — the bug that
// made an earlier version attribute @hanzochat/api's names to data-schemas.
/**
 * Four names the server requires that a freshly built barrel still does not
 * carry, even though `src/index.ts` re-exports the modules that define them
 * (`./rum/proxy`, `./endpoints` → `./custom` → `./tenantBearer`). They are
 * dropped somewhere between source and dist — not the missing-re-export bug the
 * rest of this file is about, and not yet diagnosed. Listed so the check runs
 * GREEN and enforces everything else today rather than being switched off; the
 * list may only shrink, and the check fails if a name here starts working.
 */
const KNOWN = new Set([
  'getRumProxyBodyLimit',
  'isRumProxyEnabled',
  'proxyRumRequest',
  'resolveRequestOrg',
]);

const DESTRUCTURE = new RegExp(
  String.raw`(?:const|let|var)\s*\{([^{}]*?)\}\s*=\s*require\(\s*['"]${BARREL}['"]\s*\)`,
  'g',
);

/**
 * Only files the server actually loads. `api/server/routes/admin/{config,grants,
 * groups,roles,users}.js` exist but nothing mounts them — requiring a name for
 * code that never runs is not evidence of a boot bug, and treating it as one is
 * how a checker starts crying wolf. Walk the require graph from the entrypoint.
 */
function loadedFiles() {
  const entry = join(ROOT, 'api', 'server', 'index.js');
  const seen = new Set([entry]);
  const queue = [entry];
  const REQ = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const resolveJs = (from, spec) => {
    const base = spec.startsWith('~/')
      ? join(ROOT, 'api', spec.slice(2))
      : normalize(join(dirname(from), spec));
    for (const ext of ['', '.js', '/index.js']) {
      if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext;
    }
    return null;
  };
  while (queue.length) {
    const file = queue.pop();
    for (const [, spec] of source(file).matchAll(REQ)) {
      if (!spec.startsWith('.') && !spec.startsWith('~')) continue;
      const next = resolveJs(file, spec);
      if (next && !seen.has(next) && !isTest(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function requiredNames() {
  const wanted = new Map();
  for (const file of loadedFiles()) {
    for (const [, body] of source(file).matchAll(DESTRUCTURE)) {
      for (const part of body.split(',')) {
        const name = part.split(':')[0].trim();
        if (!name || name.startsWith('...') || !/^[A-Za-z_$][\w$]*$/.test(name)) continue;
        if (!wanted.has(name)) wanted.set(name, []);
        wanted.get(name).push(relative(ROOT, file));
      }
    }
  }
  return wanted;
}

/** Rollup's CJS output assigns every export onto `exports`. Read that, not the graph. */
function publishedNames() {
  const dist = readFileSync(DIST, 'utf8');
  const names = new Set();
  for (const m of dist.matchAll(/exports\.([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  for (const m of dist.matchAll(/exports\[['"]([^'"]+)['"]\]\s*=/g)) names.add(m[1]);
  for (const m of dist.matchAll(/Object\.defineProperty\(\s*exports\s*,\s*['"]([^'"]+)['"]/g))
    names.add(m[1]);
  return names;
}

// ── run ─────────────────────────────────────────────────────────────────────
let failed = 0;

const pkg = JSON.parse(readFileSync(join(API, 'package.json'), 'utf8'));
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);

const { modules, bare } = reachableImports();
const undeclared = [...bare.keys()].filter((p) => !declared.has(p)).sort();
for (const p of undeclared) {
  console.error(`FAIL ${BARREL} imports ${p} but does not declare it — rollup will INLINE it:`);
  for (const f of bare.get(p)) console.error(`       ${f}`);
  failed += 1;
}
console.log(
  `${undeclared.length ? 'FAIL' : ' ok '} externalizable: ${bare.size} packages imported across ` +
    `${modules} reachable modules, ${undeclared.length} undeclared`,
);

if (!existsSync(DIST)) {
  console.error(`FAIL ${DIST} does not exist — run the package build before this check.`);
  failed += 1;
} else {
  const published = publishedNames();
  if (published.size === 0) {
    // Never report "everything is missing": that means this parser lost the
    // output format, not that the barrel exports nothing.
    console.error(`FAIL could not read any export from ${relative(ROOT, DIST)} — parser is stale.`);
    failed += 1;
  } else {
    const wanted = requiredNames();
    const missing = [...wanted.keys()].filter((n) => !published.has(n)).sort();
    for (const name of missing) {
      console.error(`${KNOWN.has(name) ? 'KNOWN' : 'FAIL '} ${BARREL} does not export ${name} — required by:`);
      for (const f of wanted.get(name)) console.error(`       ${f}`);
      if (!KNOWN.has(name)) failed += 1;
    }
    const stale = [...KNOWN].filter((n) => published.has(n));
    if (stale.length) {
      console.error(`FAIL these are exported now — delete them from KNOWN: ${stale.join(', ')}`);
      failed += 1;
    }
    console.log(
      `${missing.some((n) => !KNOWN.has(n)) ? 'FAIL' : ' ok '} published: ${wanted.size} names ` +
        `required of ${published.size} exported, ${missing.length} missing ` +
        `(${missing.filter((n) => KNOWN.has(n)).length} known)`,
    );
  }
}

if (failed) {
  console.error(
    `\n${failed} problem(s). Either would be invisible until the process boots: an undeclared ` +
      `import gets inlined and can fail to load, and a missing CommonJS export is \`undefined\` ` +
      `until its first call site.`,
  );
  process.exit(1);
}
