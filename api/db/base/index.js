'use strict';

/**
 * Hanzo Base data-layer adapter — entry point.
 *
 * Exposes:
 *   - `mongoose`   : the mongoose-compatible facade (feed to createModels/createMethods)
 *   - `connectDb()`: initialise the Base client and provision collections
 *   - `store`      : the underlying DocumentStore (for tests/introspection)
 */

const { logger } = require('@librechat/data-schemas');
const mongoose = require('./mongoose');
const store = require('./store');

function resolveConfig() {
  const url = process.env.HANZO_BASE_URL || process.env.BASE_URL || null;
  const token = process.env.HANZO_BASE_TOKEN || process.env.BASE_TOKEN || null;
  return { url, token };
}

let ready = null;

/**
 * Connect to Hanzo Base and ensure every registered model's collection exists.
 * Idempotent: repeated calls return the same in-flight/settled promise.
 */
async function connectDb() {
  if (ready) {
    return ready;
  }
  ready = (async () => {
    const { url, token } = resolveConfig();
    if (!url) {
      throw new Error(
        '[BaseAdapter] Please define HANZO_BASE_URL (Hanzo Base instance URL) for the data layer',
      );
    }
    await store.init({ url, token });
    try {
      await store.health();
      logger.info(`[BaseAdapter] Connected to Hanzo Base at ${url}`);
    } catch (err) {
      logger.error('[BaseAdapter] Base health check failed', err);
      throw err;
    }
    await ensureCollections();
    return mongoose;
  })();
  return ready;
}

/** Provision the Base collection for every model registered on the facade. */
async function ensureCollections() {
  const registered = mongoose.models;
  const names = Object.keys(registered);
  for (const name of names) {
    await registered[name].ensure();
  }
  logger.info(`[BaseAdapter] Provisioned ${names.length} Base collections`);
}

module.exports = { mongoose, store, connectDb, ensureCollections };
