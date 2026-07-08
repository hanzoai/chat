/**
 * One-shot MeiliSearch backfill from the SQLite document store.
 *
 * After the chat-docdb drop, MeiliSearch is driven by the store: `attachMeili`
 * indexes live Conversation/Message writes, and `config/backfill-sqlite.js`
 * already copied Mongo → SQLite. This script closes the remaining gap — it makes
 * EXISTING history searchable by reading convos + messages from the SQLite store
 * at CHAT_SQLITE_PATH and indexing them into Meili (the same fields, via the same
 * `preprocessForIndex`, that the live path uses).
 *
 * Idempotent: `addDocuments` is add-or-replace keyed by conversationId/messageId,
 * so re-running just refreshes. Run it AFTER the flip (CHAT_STORE_SQLITE set) so
 * search returns pre-existing conversations and messages.
 *
 * Run INSIDE the chat pod (has CHAT_SQLITE_PATH + MEILI_HOST + MEILI_MASTER_KEY
 * + the built package):
 *   node config/backfill-meili.js
 * Optional first arg: a comma list to limit scope (Conversation,Message).
 */
const path = require('path');
// The built package. The pnpm workspace does not hoist a bare
// `@librechat/data-schemas` symlink to the app root (where this script runs via
// `node config/backfill-meili.js`), so fall back to the workspace path.
function loadDataSchemas() {
  try {
    return require('@librechat/data-schemas');
  } catch {
    return require(path.resolve(__dirname, '../packages/data-schemas'));
  }
}
const { createSqliteHandle, backfillMeili, CHAT_COLLECTION_SPECS } = loadDataSchemas();

async function main() {
  const dbPath = process.env.CHAT_SQLITE_PATH;
  if (!dbPath) {
    throw new Error('CHAT_SQLITE_PATH is required');
  }
  if (!process.env.MEILI_HOST || !process.env.MEILI_MASTER_KEY) {
    throw new Error('MEILI_HOST and MEILI_MASTER_KEY are required');
  }

  const only = (process.argv[2] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const searchable = ['Conversation', 'Message'];
  const names = (only.length ? only : searchable).filter(
    (n) => searchable.includes(n) && n in CHAT_COLLECTION_SPECS,
  );

  if (names.length === 0) {
    throw new Error('No searchable collections selected (expected Conversation and/or Message)');
  }

  console.log(`[backfill-meili] sqlite=${dbPath}  collections=${names.join(',')}`);

  const handle = createSqliteHandle(names, { dbPath });
  try {
    const report = await backfillMeili(handle.models);
    for (const { collection, indexed } of report) {
      console.log(`[backfill-meili] OK  ${collection.padEnd(12)} indexed=${String(indexed).padStart(7)}`);
    }
    const total = report.reduce((n, r) => n + r.indexed, 0);
    console.log(`[backfill-meili] DONE — ${total} documents indexed into MeiliSearch.`);
  } finally {
    handle.close();
  }
}

main().catch((err) => {
  console.error('[backfill-meili] ERROR:', err);
  process.exit(1);
});
