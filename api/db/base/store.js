'use strict';

/**
 * DocumentStore — the Hanzo Base backend for the Mongoose adapter.
 *
 * Each Mongo model maps to one Base collection whose records carry the full
 * document as a JSON `data` field plus a handful of promoted scalar columns
 * (derived from indexed/unique schema paths) used only for filter pushdown.
 *
 * Filter pushdown builds a Base filter-DSL string that is guaranteed to be a
 * SUPERSET of the true result; query.js then narrows it in JS, so pushdown can
 * be as conservative as needed without ever being wrong.
 */

const { idString } = require('./query');

// `@hanzo/base` ships as an ESM-only package (exports expose only the `import`
// condition), so it must be loaded from this CommonJS module via dynamic import.
let _baseModulePromise = null;
function loadBase() {
  if (!_baseModulePromise) {
    _baseModulePromise = import('@hanzo/base');
  }
  return _baseModulePromise;
}

const DATA_FIELD_MAX_SIZE = 8 * 1024 * 1024; // 8 MiB per document

/** Escape a string value for the Base filter DSL (single-quoted). */
function quote(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Format a scalar for the filter DSL, or return undefined if not pushable. */
function literal(value) {
  const v = idString(value);
  if (v === null || v === undefined) {
    return undefined;
  }
  if (typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }
  if (v instanceof Date) {
    return quote(v.toISOString());
  }
  if (typeof v === 'string') {
    return quote(v);
  }
  return undefined;
}

/**
 * Collect conjunctive (AND-ed) constraints on promoted fields into a Base DSL
 * filter. Disjunctions and non-promoted / operator predicates are skipped —
 * the JS matcher enforces them — keeping the result a safe superset.
 */
function buildFilter(query, promoted) {
  const promotedSet = new Set(promoted);
  const clauses = [];

  const walk = (q) => {
    if (!q || typeof q !== 'object') {
      return;
    }
    for (const [key, val] of Object.entries(q)) {
      if (key === '$and' && Array.isArray(val)) {
        val.forEach(walk);
        continue;
      }
      if (key.startsWith('$')) {
        continue; // $or/$nor/etc — not safe to push
      }
      if (!promotedSet.has(key)) {
        continue;
      }
      if (val === null || typeof val !== 'object' || val instanceof Date) {
        const lit = literal(val);
        if (lit !== undefined) {
          clauses.push(`${key} = ${lit}`);
        }
        continue;
      }
      if (Array.isArray(val)) {
        continue;
      }
      // operator expression on a promoted field
      if (Array.isArray(val.$in) && val.$in.length) {
        const parts = val.$in.map((v) => literal(v)).filter((l) => l !== undefined);
        if (parts.length === val.$in.length) {
          clauses.push(`(${parts.map((l) => `${key} = ${l}`).join(' || ')})`);
        }
        continue;
      }
      if (val.$eq !== undefined) {
        const lit = literal(val.$eq);
        if (lit !== undefined) {
          clauses.push(`${key} = ${lit}`);
        }
      }
    }
  };

  walk(query);
  return clauses.length ? clauses.join(' && ') : undefined;
}

class DocumentStore {
  constructor() {
    this.client = null;
    this.url = null;
    this._ensured = new Set();
  }

  /** @param {{ url: string, token?: string }} config */
  async init({ url, token }) {
    if (!url) {
      throw new Error('[BaseStore] Base URL is required (HANZO_BASE_URL / BASE_URL)');
    }
    const { BaseClient } = await loadBase();
    this.url = url.replace(/\/$/, '');
    this.client = new BaseClient(this.url);
    if (token) {
      this.client.authStore.save(token, null);
    }
    return this;
  }

  async health() {
    return this.client.send('/v1/health');
  }

  /** Idempotently ensure the Base collection exists with the required schema. */
  async ensureCollection(name, promoted) {
    if (this._ensured.has(name)) {
      return;
    }
    try {
      await this.client.send(`/v1/collections/${name}`, { method: 'GET' });
      this._ensured.add(name);
      return;
    } catch (err) {
      if (!isNotFound(err)) {
        throw err;
      }
    }

    const fields = [{ name: 'data', type: 'json', maxSize: DATA_FIELD_MAX_SIZE }];
    for (const col of promoted) {
      fields.push({ name: col.name, type: col.type });
    }
    const body = {
      name,
      type: 'base',
      fields,
      indexes: [`CREATE UNIQUE INDEX \`idx_${name}__id\` ON \`${name}\` (\`_id\`)`],
    };
    try {
      await this.client.send('/v1/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // Tolerate a concurrent creator (unique-name violation).
      if (!isConflict(err) && !isNotFound(err)) {
        throw err;
      }
    }
    this._ensured.add(name);
  }

  _parse(record) {
    let doc = record.data;
    if (typeof doc === 'string') {
      try {
        doc = JSON.parse(doc);
      } catch {
        doc = {};
      }
    }
    return { baseId: record.id, doc: doc || {} };
  }

  /** List candidate docs for a Mongo filter (superset via pushdown). */
  async list(collectionName, mongoFilter, promotedNames) {
    const filter = buildFilter(mongoFilter, promotedNames || []);
    const items = await this.client
      .collection(collectionName)
      .getFullList(filter ? { filter } : {});
    return items.map((r) => this._parse(r));
  }

  async create(collectionName, record) {
    const created = await this.client.collection(collectionName).create(record);
    return this._parse(created);
  }

  async update(collectionName, baseId, record) {
    const updated = await this.client.collection(collectionName).update(baseId, record);
    return this._parse(updated);
  }

  async delete(collectionName, baseId) {
    await this.client.collection(collectionName).delete(baseId);
  }
}

function statusOf(err) {
  return (err && (err.status || (err.data && err.data.status))) || 0;
}
function isNotFound(err) {
  return statusOf(err) === 404;
}
function isConflict(err) {
  return statusOf(err) === 400 || statusOf(err) === 409;
}

module.exports = new DocumentStore();
module.exports.DocumentStore = DocumentStore;
module.exports.buildFilter = buildFilter;
