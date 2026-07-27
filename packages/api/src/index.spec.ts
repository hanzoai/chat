import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * The barrel IS the package: `api/server/routes/*` destructure from
 * `@hanzochat/api` and nothing else, so a name the barrel cannot reach resolves
 * to `undefined` at require time and the server exits 1 before it listens. The
 * routes are CommonJS, so `tsc` never sees the gap — it surfaces only at boot,
 * in production (`createSkillsHandlers is not a function`, chat v1.0.20/21).
 *
 * Walk what the barrel actually re-exports and assert every name a route needs
 * is reachable from it.
 */

const SRC = __dirname;

/** Resolve a relative `export * from` target to a file. */
function fileFor(from: string, target: string): string | null {
  const base = resolve(dirname(from), target);
  for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Every file whose exports the barrel republishes, transitively. */
function reachable(entry: string, seen = new Set<string>()): Set<string> {
  if (seen.has(entry)) {
    return seen;
  }
  seen.add(entry);
  const source = readFileSync(entry, 'utf8');
  for (const [, target] of source.matchAll(/^export \*(?: type)? from '(\.[^']+)';/gm)) {
    const next = fileFor(entry, target);
    if (next) {
      reachable(next, seen);
    }
  }
  return seen;
}

const published = reachable(join(SRC, 'index.ts'));

const exportsName = (name: string) =>
  [...published].some((file) =>
    new RegExp(`^export (?:declare )?(?:async )?(?:function|const|class) ${name}\\b`, 'm').test(
      readFileSync(file, 'utf8'),
    ),
  );

/** What each route file destructures from `@hanzochat/api`. */
const routeSurface: Record<string, string[]> = {
  'routes/skills.js': [
    'createSkillsHandlers',
    'createImportHandler',
    'generateCheckAccess',
    'getStorageMetadata',
    'resolveRequestTenantId',
    'restoreTenantContextFromReq',
  ],
};

describe('the barrel publishes what the routes require', () => {
  for (const [route, names] of Object.entries(routeSurface)) {
    describe(route, () => {
      for (const name of names) {
        it(`publishes ${name}`, () => {
          expect(exportsName(name)).toBe(true);
        });
      }
    });
  }
});
