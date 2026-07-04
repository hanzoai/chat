const { logger } = require('@librechat/data-schemas');

/**
 * Search index sync.
 *
 * MongoDB + MeiliSearch have been dropped. Full-text search now runs directly
 * on Hanzo Base/SQLite via the data-layer adapter (the model `meiliSearch()`
 * method in api/db/base searches content fields on Base). There is no separate
 * index to sync, so this is a no-op kept for boot-sequence compatibility
 * (api/server/index.js calls `indexSync()`).
 */
async function indexSync() {
  logger.info('[indexSync] Base/SQLite search active — no external index to sync');
}

module.exports = indexSync;
