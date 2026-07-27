import fs from 'fs';
import path from 'path';
import { builtinModules } from 'module';

/**
 * Everything this package PUBLISHES has to be installable.
 *
 * `api/server/*` requires the built barrel at boot, before the server listens.
 * Rollup leaves every bare import as a `require(...)` in dist, so publishing a
 * module that imports something no manifest declares is not a build error — it
 * is a container that exits 1 at require time. That is how hanzo.chat 502'd with
 * zero endpoints: widening the barrel to `src/skills` and `src/storage`
 * published code importing `jszip`, `@aws-sdk/cloudfront-signer` and
 * `@aws-sdk/client-cloudfront`, which nothing declared, so nothing installed.
 *
 * tsc cannot catch it (the requiring side is CommonJS with no types) and neither
 * can a unit test that mocks its imports. This walks the barrel's own export
 * graph and asserts the lockfile carries every external module it reaches — the
 * lockfile being exactly what `pnpm install --frozen-lockfile` puts in the image,
 * whether the module is declared here or comes in under something that is.
 *
 * Scope is deliberately the export graph, not all of src/: a subtree the barrel
 * does not publish is never required at boot.
 */
const packageRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const barrel = path.join(packageRoot, 'src', 'index.ts');
const builtin = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

/** Every package name the lockfile resolves, direct or transitive. Entries look
 *  like `  jszip@3.10.1:` and, quoted once peer suffixes appear,
 *  `  '@langchain/core@1.2.2(...)':`. */
function lockedName(entry: string): string {
  const key = entry.replace(/^['"]|['"]$/g, '');
  const at = key.indexOf('@', key.startsWith('@') ? 1 : 0);
  return at > 0 ? key.slice(0, at) : key;
}

/** Sibling workspace packages resolve by link, never by lockfile entry. */
const workspacePackages = fs
  .readdirSync(path.join(workspaceRoot, 'packages'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) =>
    JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'packages', entry.name, 'package.json'), 'utf8'),
    ),
  )
  .map((manifest) => manifest.name as string);

const locked = new Set([
  ...workspacePackages,
  ...fs
    .readFileSync(path.join(workspaceRoot, 'pnpm-lock.yaml'), 'utf8')
    .split('\n')
    .filter((line) => /^ {2}\S.*:$/.test(line))
    .map((line) => lockedName(line.trim().replace(/:$/, '')))
    .filter(Boolean),
]);

/** `@scope/name/deep/path` and `name/deep/path` both resolve to their package. */
function packageOf(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** The file a relative specifier names, as either `x.ts` or `x/index.ts`. */
function resolveLocal(fromFile: string, specifier: string): string | undefined {
  const base = path.resolve(path.dirname(fromFile), specifier);
  return ['.ts', '.tsx', '/index.ts', '/index.tsx']
    .map((suffix) => base + suffix)
    .find((candidate) => fs.existsSync(candidate));
}

/** Import/export statements only — anchored at line start, so quoted paths inside
 *  template literals (prompt examples) are not mistaken for imports. */
const SPECIFIER = /^\s*(?:import|export)\s(?:[\s\S]*?\sfrom\s)?['"]([^'"]+)['"]/gm;

describe('published dependencies', () => {
  it('locks every module the barrel reaches', () => {
    const visited = new Set<string>();
    const missing = new Map<string, string>();
    const queue = [barrel];

    while (queue.length > 0) {
      const file = queue.pop() as string;
      if (visited.has(file)) {
        continue;
      }
      visited.add(file);

      const source = fs.readFileSync(file, 'utf8');
      for (const [, specifier] of source.matchAll(SPECIFIER)) {
        /* Bare `/…` is not a module specifier — it only shows up where prompt
           text quotes example imports. */
        if (!specifier || specifier.startsWith('/')) {
          continue;
        }
        if (specifier.startsWith('.') || specifier.startsWith('~')) {
          const local = resolveLocal(
            specifier.startsWith('~') ? barrel : file,
            specifier.startsWith('~') ? `./${specifier.slice(2)}` : specifier,
          );
          if (local) {
            queue.push(local);
          }
          continue;
        }
        const name = packageOf(specifier);
        if (builtin.has(name) || locked.has(name) || missing.has(name)) {
          continue;
        }
        missing.set(name, path.relative(packageRoot, file));
      }
    }

    expect(visited.size).toBeGreaterThan(50);
    expect([...missing].map(([name, file]) => `${name} (reached from ${file})`)).toEqual([]);
  });
});
