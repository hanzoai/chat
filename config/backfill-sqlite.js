/**
 * One-shot Mongo → SQLite backfill + reconcile for the chat-docdb drop.
 *
 * Copies every migrated collection from MongoDB (chat-docdb) into the embedded
 * SQLite document store at CHAT_SQLITE_PATH, keyed by each document's own `_id`
 * (BSON ObjectId → hex, preserved exactly). It uses the SAME `upsertRaw`
 * primitive the live dual-write mirror uses, so running it while dual-write is
 * enabled is safe and idempotent: a doc already mirrored by a live write and the
 * same doc copied here share the `_id` and collapse to one row (INSERT OR
 * REPLACE) — no duplicates. Re-run it as many times as you like.
 *
 * Then it reconciles: for every collection it prints `mongo == sqlite` and exits
 * non-zero if ANY collection's SQLite count is short of Mongo — the gate that
 * must be green before flipping CHAT_STORE_SQLITE.
 *
 * Run INSIDE the chat pod (has MONGO_URI + CHAT_SQLITE_PATH + the built package):
 *   node config/backfill-sqlite.js
 * Optional: pass a comma list of collection (model) names to limit scope.
 */
const path = require('path');
const { MongoClient } = require('mongodb');
// The built package. The pnpm workspace does not hoist a bare
// `@librechat/data-schemas` symlink to the app root (where this script runs via
// `node config/backfill-sqlite.js`), so fall back to the workspace path.
function loadDataSchemas() {
  try {
    return require('@librechat/data-schemas');
  } catch {
    return require(path.resolve(__dirname, '../packages/data-schemas'));
  }
}
const { createSqliteHandle, CHAT_COLLECTION_SPECS } = loadDataSchemas();

// model (spec) name -> mongo collection name. Explicit, not derived, so the
// mapping is auditable and never depends on mongoose pluralization quirks.
const MONGO_COLLECTION = {
  Conversation: 'conversations',
  Message: 'messages',
  Preset: 'presets',
  ConversationTag: 'conversationtags',
  SharedLink: 'sharedlinks',
  Project: 'projects',
  File: 'files',
  Key: 'keys',
  PluginAuth: 'pluginauths',
  Banner: 'banners',
  MCPServer: 'mcpservers',
  Prompt: 'prompts',
  PromptGroup: 'promptgroups',
  AgentApiKey: 'agentapikeys',
  Assistant: 'assistants',
  Action: 'actions',
  ToolCall: 'toolcalls',
  MemoryEntry: 'memoryentries',
  Role: 'roles',
  AccessRole: 'accessroles',
  Agent: 'agents',
  AgentCategory: 'agentcategories',
  AclEntry: 'aclentries',
  Group: 'groups',
  User: 'users',
  Session: 'sessions',
  Token: 'tokens',
  Balance: 'balances',
  Transaction: 'transactions',
};

async function main() {
  const uri = process.env.MONGO_URI;
  const dbPath = process.env.CHAT_SQLITE_PATH;
  if (!uri) {
    throw new Error('MONGO_URI is required');
  }
  if (!dbPath) {
    throw new Error('CHAT_SQLITE_PATH is required');
  }

  const only = (process.argv[2] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const names = (only.length ? only : Object.keys(MONGO_COLLECTION)).filter(
    (n) => n in CHAT_COLLECTION_SPECS && n in MONGO_COLLECTION,
  );

  console.log(`[backfill] sqlite=${dbPath}  collections=${names.length}`);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const handle = createSqliteHandle(names, { dbPath });

  const report = [];
  let failed = false;

  for (const name of names) {
    const coll = db.collection(MONGO_COLLECTION[name]);
    const model = handle.models[name];
    const mongoCount = await coll.countDocuments();
    let copied = 0;
    const cursor = coll.find({});
    for await (const doc of cursor) {
      model.upsertRaw(doc);
      copied++;
    }
    const sqliteCount = await model.countDocuments({});
    const ok = sqliteCount >= mongoCount;
    if (!ok) {
      failed = true;
    }
    report.push({ name, mongo: mongoCount, copied, sqlite: sqliteCount, ok });
    console.log(
      `[backfill] ${ok ? 'OK ' : 'MISMATCH'} ${name.padEnd(16)} mongo=${String(mongoCount).padStart(6)}  sqlite=${String(sqliteCount).padStart(6)}`,
    );
  }

  handle.close();
  await client.close();

  const matched = report.filter((r) => r.ok).length;
  console.log(`[backfill] reconcile: ${matched}/${report.length} collections mongo<=sqlite`);
  if (failed) {
    console.error('[backfill] FAILED — at least one collection is short in SQLite. Re-run.');
    process.exit(1);
  }
  console.log('[backfill] DONE — all collections reconciled. Safe to flip CHAT_STORE_SQLITE.');
}

main().catch((err) => {
  console.error('[backfill] ERROR:', err);
  process.exit(1);
});
