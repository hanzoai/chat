/**
 * CI test runner for @librechat/data-schemas.
 *
 * The spec files listed in ISOLATED instantiate the native `better-sqlite3-*`
 * driver. Jest gives every spec file its own JS module realm, but the native
 * addon is process-cached per worker, so cross-file state corrupts sibling
 * in-memory databases (driver-agnostic — reproduces with mainstream
 * better-sqlite3 too; a compound `json_extract` UNIQUE stops firing). Production
 * is unaffected: it runs one module realm with one shared handle for the process
 * lifetime. The fix is strict one-file-per-process isolation for those specs
 * only — NOT `--runInBand`/`--maxWorkers=1` (a single shared worker still
 * corrupts). Everything else runs in the normal coverage pass.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const JEST = join(dirname(require.resolve('jest/package.json')), 'bin', 'jest.js');

/** Native-driver specs — each run in its own process. */
const ISOLATED = [
  'src/stores/sqlite/DocModel.spec.ts',
  'src/stores/sqlite/DualWriteModel.spec.ts',
  'src/models/storeRegistry.spec.ts',
  'src/models/plugins/tenantIsolation.coverage.spec.ts',
  'src/methods/convoMessage.sqlite.spec.ts',
  'src/methods/distinct.sqlite.spec.ts',
  'src/methods/skill.harness.sqlite.spec.ts',
  'src/methods/batch2.sqlite.spec.ts',
  'src/methods/batch3.sqlite.spec.ts',
  'src/methods/batch4.sqlite.spec.ts',
  'src/methods/batch5.sqlite.spec.ts',
  'src/methods/batch6.sqlite.spec.ts',
  'src/methods/batch7.sqlite.spec.ts',
  'src/methods/batch7b.sqlite.spec.ts',
  'src/methods/batch8a.sqlite.spec.ts',
  'src/methods/batch8b.sqlite.spec.ts',
  'src/methods/authStore.sqlite.spec.ts',
];

const runJest = (args) =>
  spawnSync(process.execPath, [JEST, '--ci', ...args], { stdio: 'inherit' }).status === 0;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let ok = true;

// 1) Normal coverage run for everything except the isolated set.
console.log(`\n[ci] coverage run (excluding ${ISOLATED.length} native-driver specs)`);
const ignore = ['/node_modules/', ...ISOLATED.map((f) => escapeRegExp(f) + '$')];
if (!runJest(['--coverage', '--testPathIgnorePatterns', ...ignore])) {
  ok = false;
}

// 2) Each native-driver spec in its own process.
for (const file of ISOLATED) {
  console.log(`\n[ci] isolated: ${file}`);
  if (!runJest([file])) {
    ok = false;
  }
}

process.exit(ok ? 0 : 1);
