'use strict';

/**
 * Introspects a real Mongoose Schema (built by @librechat/data-schemas as a
 * pure schema DSL — never connected to Mongo) and distills exactly what the
 * Base adapter needs:
 *   - default values to apply on insert
 *   - whether timestamps (createdAt/updatedAt) are managed
 *   - which primitive fields to promote to real Base columns for filter/sort
 *
 * Everything else about the Mongoose schema (validators, casting, refs) is
 * intentionally ignored: the adapter trusts the application layer and stores
 * the full document as JSON.
 */

const PRIMITIVE_INSTANCES = new Set(['String', 'Number', 'Date', 'Boolean', 'ObjectID', 'ObjectId']);

/** Identifier / scoping fields that are `meiliIndex` but not useful free-text search targets. */
const SEARCH_STOPLIST = new Set([
  '_id',
  '_meiliIndex',
  'conversationId',
  'messageId',
  'user',
  'organization',
  'endpoint',
  'model',
  'sender',
]);

/** Map a Mongoose SchemaType instance to a Base column type. */
function baseColumnType(instance) {
  switch (instance) {
    case 'Number':
      return 'number';
    case 'Boolean':
      return 'bool';
    case 'Date':
      return 'date';
    default:
      return 'text';
  }
}

/**
 * @param {import('mongoose').Schema} schema
 * @returns {{
 *   defaults: Array<[string, unknown]>,
 *   timestamps: { createdAt: string, updatedAt: string } | null,
 *   promoted: Array<{ name: string, type: string, unique: boolean }>,
 *   deselected: Set<string>,
 *   dateFields: Set<string>,
 * }}
 */
function describeSchema(schema) {
  const defaults = [];
  const promoted = new Map();
  const deselected = new Set();
  const dateFields = new Set();
  const searchable = new Set();

  // Always promote _id so document lookup by id is a real, unique Base column.
  promoted.set('_id', { name: '_id', type: 'text', unique: true });

  const paths = schema.paths || {};
  for (const name of Object.keys(paths)) {
    if (name === '_id' || name === '__v') {
      continue;
    }
    const type = paths[name];
    const options = type.options || {};

    // Fields marked `select: false` are excluded from reads by default
    // (Mongoose semantics) — critical for secrets: password, totpSecret,
    // backupCodes, keyHash. Only returned when explicitly `+selected`.
    if (options.select === false) {
      deselected.add(name);
    }

    // All Date-typed paths must be re-hydrated to Date objects on read so
    // callers can safely call `.getTime()` / date methods (e.g. session.expiration).
    if (type.instance === 'Date') {
      dateFields.add(name);
    }

    // Free-text search targets: fields flagged for MeiliSearch that are actual
    // content (title, text, …), not identifiers. Used by Base/SQLite FTS.
    if (options.meiliIndex && type.instance === 'String' && !SEARCH_STOPLIST.has(name)) {
      searchable.add(name);
    }

    // Collect declared defaults for primitive top-level paths (no dots).
    if (!name.includes('.') && Object.prototype.hasOwnProperty.call(options, 'default')) {
      defaults.push([name, options.default]);
    }

    // Promote indexed / unique primitive fields to Base columns for filtering.
    // A DB-level UNIQUE index is only safe for always-present unique keys
    // (unique && required) — e.g. conversationId, messageId — to avoid the
    // sparse-null conflicts of optional unique fields (googleId, openidId, …),
    // whose logical uniqueness stays enforced by the adapter-level upsert.
    if (!name.includes('.') && PRIMITIVE_INSTANCES.has(type.instance)) {
      if ((options.index || options.unique) && !promoted.has(name)) {
        const columnType = baseColumnType(type.instance);
        promoted.set(name, {
          name,
          type: columnType,
          // Full UNIQUE for always-present keys (conversationId, messageId, email).
          unique: !!(options.unique && options.required),
          // Partial UNIQUE (WHERE != '') for optional unique text keys
          // (googleId, openidId, username, …): DB-level race safety without the
          // sparse-null conflict.
          sparseUnique: !!(options.unique && !options.required && columnType === 'text'),
        });
      }
    }
  }

  // Single-field indexes declared via schema.index({ field: 1 }).
  try {
    for (const [spec] of schema.indexes()) {
      const fields = Object.keys(spec || {});
      if (fields.length === 1) {
        const f = fields[0];
        if (f !== '_id' && !f.includes('.') && paths[f] && PRIMITIVE_INSTANCES.has(paths[f].instance) && !promoted.has(f)) {
          promoted.set(f, { name: f, type: baseColumnType(paths[f].instance), unique: false });
        }
      }
    }
  } catch {
    /* schema.indexes() unavailable — ignore */
  }

  let timestamps = null;
  const tsOpt = schema.options && schema.options.timestamps;
  if (tsOpt) {
    timestamps =
      tsOpt === true
        ? { createdAt: 'createdAt', updatedAt: 'updatedAt' }
        : {
            createdAt: tsOpt.createdAt || 'createdAt',
            updatedAt: tsOpt.updatedAt || 'updatedAt',
          };
    for (const f of [timestamps.createdAt, timestamps.updatedAt]) {
      dateFields.add(f);
      if (!promoted.has(f)) {
        promoted.set(f, { name: f, type: 'date', unique: false });
      }
    }
  }

  return {
    defaults,
    timestamps,
    promoted: [...promoted.values()],
    deselected,
    dateFields,
    searchable,
  };
}

/** Resolve a schema default (calling it if it is a function). */
function resolveDefault(def) {
  return typeof def === 'function' ? def() : def;
}

module.exports = { describeSchema, resolveDefault, baseColumnType };
