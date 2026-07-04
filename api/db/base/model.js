'use strict';

/**
 * BaseModel — a Mongoose-Model-compatible facade backed by Hanzo Base.
 *
 * One instance per collection. It presents the subset of the Mongoose Model
 * static API that the LibreChat data layer actually uses (find / findOne /
 * findOneAndUpdate / create / updateOne / deleteMany / countDocuments /
 * bulkWrite / aggregate …) and executes it against a document `store`
 * (see store.js) whose records hold the full Mongo document as JSON.
 *
 * Correctness comes from query.js: candidate records are fetched from Base
 * (with best-effort filter pushdown) and every predicate, update operator,
 * projection and sort is then evaluated in JS.
 */

const {
  matches,
  applyUpdate,
  parseProjection,
  applyProjection,
  sortDocs,
  getPath,
  setPath,
  idString,
} = require('./query');
const { describeSchema, resolveDefault } = require('./schema');
const { generateObjectId } = require('./objectId');

function now() {
  return new Date();
}

/**
 * Parse a MeiliSearch-style filter string (e.g. `user = "abc"`) into a Mongo
 * equality filter for scoping. Supports the `field = "value"` / `field = 'value'`
 * clauses the chat app emits; unknown syntax is ignored (no scoping).
 */
function parseMeiliFilter(filter) {
  const scope = {};
  if (typeof filter !== 'string') {
    return scope;
  }
  const re = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(filter)) !== null) {
    scope[m[1]] = m[2] !== undefined ? m[2] : m[3];
  }
  return scope;
}

/** Extract top-level equality conditions from a filter (for upsert seeding). */
function equalitySeed(filter) {
  const seed = {};
  if (!filter || typeof filter !== 'object') {
    return seed;
  }
  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith('$')) {
      continue;
    }
    if (v === null || typeof v !== 'object' || v instanceof Date || Array.isArray(v)) {
      seed[k] = v;
    }
  }
  return seed;
}

class BaseModel {
  /**
   * @param {string} name - Mongoose model name (e.g. "Conversation")
   * @param {import('mongoose').Schema} schema
   * @param {import('./store').DocumentStore} store
   */
  constructor(name, schema, store) {
    this.modelName = name;
    this.schema = schema;
    this.store = store;
    this.collection = { collectionName: name.toLowerCase() };
    this.collectionName = name.toLowerCase();

    const desc = describeSchema(schema);
    this._defaults = desc.defaults;
    this._timestamps = desc.timestamps;
    this._promoted = desc.promoted;
    this._promotedNames = desc.promoted.map((p) => p.name);
    this._deselected = desc.deselected;
    this._dateFields = desc.dateFields;
    this._searchable = desc.searchable;
  }

  /** Register/verify this collection's schema in Base. Idempotent. */
  async ensure() {
    await this.store.ensureCollection(this.collectionName, this._promoted);
  }

  // ---- internal helpers -------------------------------------------------

  /** Build the persisted record { promoted columns…, data } from a Mongo doc. */
  _toRecord(doc) {
    const record = { data: doc };
    for (const col of this._promoted) {
      let v = idString(getPath(doc, col.name));
      if (v === undefined) {
        v = null;
      }
      if (v instanceof Date) {
        v = v.toISOString();
      }
      record[col.name] = v;
    }
    return record;
  }

  /** Materialize a stored Mongo doc: all Date-typed fields become Date objects. */
  _hydrate(doc) {
    for (const f of this._dateFields) {
      const v = getPath(doc, f);
      // Cast ISO strings and epoch numbers (e.g. `default: Date.now`) to Date.
      if (typeof v === 'string' || typeof v === 'number') {
        setPath(doc, f, new Date(v));
      }
    }
    return doc;
  }

  /** Apply schema defaults for keys absent from doc. */
  _applyDefaults(doc) {
    for (const [name, def] of this._defaults) {
      if (doc[name] === undefined) {
        const value = resolveDefault(def);
        if (value !== undefined) {
          doc[name] = value;
        }
      }
    }
  }

  /** Fetch candidate {baseId, doc} records for a filter (pushdown + always safe). */
  async _candidates(filter) {
    const raw = await this.store.list(this.collectionName, filter, this._promotedNames);
    return raw;
  }

  _newDoc(seed) {
    const doc = { ...seed };
    if (!doc._id) {
      doc._id = generateObjectId();
    }
    this._applyDefaults(doc);
    if (this._timestamps) {
      const ts = now();
      if (doc[this._timestamps.createdAt] === undefined) {
        doc[this._timestamps.createdAt] = ts;
      }
      doc[this._timestamps.updatedAt] = ts;
    }
    return doc;
  }

  async _insert(doc) {
    const stored = { ...doc };
    // Persist Dates as ISO strings inside the JSON blob.
    if (this._timestamps) {
      for (const f of [this._timestamps.createdAt, this._timestamps.updatedAt]) {
        if (stored[f] instanceof Date) {
          stored[f] = stored[f].toISOString();
        }
      }
    }
    const rec = await this.store.create(this.collectionName, this._toRecord(stored));
    return rec.baseId;
  }

  async _replace(baseId, doc, { touch = true } = {}) {
    if (this._timestamps && touch) {
      doc[this._timestamps.updatedAt] = now(); // reflect fresh updatedAt on the caller's doc
    }
    const stored = { ...doc };
    if (this._timestamps) {
      for (const f of [this._timestamps.createdAt, this._timestamps.updatedAt]) {
        if (stored[f] instanceof Date) {
          stored[f] = stored[f].toISOString();
        }
      }
    }
    await this.store.update(this.collectionName, baseId, this._toRecord(stored));
  }

  // ---- write operations -------------------------------------------------

  async _create(input) {
    const doc = this._newDoc(input);
    await this._insert(doc);
    return this._hydrate({ ...doc });
  }

  /** `new Model(data)` — build an unsaved document (defaults + _id) with .save(). */
  _newDocument(data = {}) {
    return makeDocument(this, this._hydrate(this._newDoc(data)));
  }

  async create(input) {
    if (Array.isArray(input)) {
      const out = [];
      for (const item of input) {
        out.push(makeDocument(this, await this._create(item)));
      }
      return out;
    }
    return makeDocument(this, await this._create(input));
  }

  async insertMany(docs, options = {}) {
    const created = [];
    for (const d of docs) {
      created.push(await this._create(d));
    }
    if (options.lean) {
      return created;
    }
    return created.map((d) => makeDocument(this, d));
  }

  /**
   * Core upsert/update primitive shared by findOneAndUpdate/updateOne/updateMany.
   * @returns {{ doc: object|null, matched: number, modified: number, upserted: boolean }}
   */
  async _updateOneInternal(filter, update, options = {}) {
    const candidates = await this._candidates(filter);
    const hit = candidates.find((c) => matches(c.doc, filter));
    if (hit) {
      const before = this._hydrate({ ...hit.doc });
      const next = { ...hit.doc };
      applyUpdate(next, update, { isInsert: false });
      await this._replace(hit.baseId, next, { touch: options.timestamps !== false });
      return { doc: this._hydrate(next), before, matched: 1, modified: 1, upserted: false };
    }
    if (options.upsert) {
      const seed = equalitySeed(filter);
      const doc = { ...seed };
      applyUpdate(doc, update, { isInsert: true });
      const full = this._newDoc(doc);
      await this._insert(full);
      return { doc: this._hydrate(full), before: null, matched: 0, modified: 0, upserted: true };
    }
    return { doc: null, before: null, matched: 0, modified: 0, upserted: false };
  }

  findOneAndUpdate(filter, update, options = {}) {
    return new Query(this, 'findOneAndUpdate', { filter, update, options });
  }

  findByIdAndUpdate(id, update, options = {}) {
    return this.findOneAndUpdate({ _id: id }, update, options);
  }

  findOneAndDelete(filter) {
    return new Query(this, 'findOneAndDelete', { filter });
  }

  async updateOne(filter, update, options = {}) {
    const r = await this._updateOneInternalPublic(filter, update, options);
    return r;
  }

  async _updateOneInternalPublic(filter, update, options) {
    const r = await this._updateOneInternal(filter, update, options);
    return {
      acknowledged: true,
      matchedCount: r.matched,
      modifiedCount: r.modified,
      upsertedCount: r.upserted ? 1 : 0,
      upsertedId: r.upserted ? r.doc._id : null,
    };
  }

  async updateMany(filter, update, options = {}) {
    const candidates = await this._candidates(filter);
    const hits = candidates.filter((c) => matches(c.doc, filter));
    for (const hit of hits) {
      const next = { ...hit.doc };
      applyUpdate(next, update, { isInsert: false });
      await this._replace(hit.baseId, next, { touch: options.timestamps !== false });
    }
    if (!hits.length && options.upsert) {
      const seed = equalitySeed(filter);
      const doc = { ...seed };
      applyUpdate(doc, update, { isInsert: true });
      await this._insert(this._newDoc(doc));
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    return {
      acknowledged: true,
      matchedCount: hits.length,
      modifiedCount: hits.length,
      upsertedCount: 0,
    };
  }

  async _deleteWhere(filter, limit) {
    const candidates = await this._candidates(filter);
    const hits = candidates.filter((c) => matches(c.doc, filter));
    const toDelete = limit ? hits.slice(0, limit) : hits;
    for (const hit of toDelete) {
      await this.store.delete(this.collectionName, hit.baseId);
    }
    return { acknowledged: true, deletedCount: toDelete.length };
  }

  deleteOne(filter) {
    return this._deleteWhere(filter, 1);
  }

  deleteMany(filter) {
    return this._deleteWhere(filter || {}, 0);
  }

  // ---- read operations --------------------------------------------------

  find(filter = {}, projection, options) {
    return new Query(this, 'find', { filter, projection, options });
  }

  findOne(filter = {}, projection, options) {
    return new Query(this, 'findOne', { filter, projection, options });
  }

  findById(id, projection, options) {
    return new Query(this, 'findOne', { filter: { _id: id }, projection, options });
  }

  async countDocuments(filter = {}) {
    const candidates = await this._candidates(filter);
    return candidates.filter((c) => matches(c.doc, filter)).length;
  }

  async estimatedDocumentCount() {
    const candidates = await this._candidates({});
    return candidates.length;
  }

  async distinct(field, filter = {}) {
    const candidates = await this._candidates(filter);
    const set = new Set();
    for (const c of candidates) {
      if (!matches(c.doc, filter)) {
        continue;
      }
      const v = getPath(c.doc, field);
      if (Array.isArray(v)) {
        v.forEach((x) => set.add(x));
      } else if (v !== undefined) {
        set.add(v);
      }
    }
    return [...set];
  }

  async exists(filter) {
    const candidates = await this._candidates(filter);
    const hit = candidates.find((c) => matches(c.doc, filter));
    return hit ? { _id: hit.doc._id } : null;
  }

  /**
   * Full-text search over Base/SQLite (replaces MeiliSearch).
   * Case-insensitive substring match across the model's searchable content
   * fields (title, text, …), scoped by the Meili-style `opts.filter` string
   * (e.g. `user = "abc"`). Returns MeiliSearch-shaped `{ hits }`.
   */
  async meiliSearch(query, opts = {}) {
    const terms = (query || '').trim().toLowerCase();
    if (!terms || !this._searchable.size) {
      return { hits: [] };
    }
    const scope = parseMeiliFilter(opts.filter);
    const candidates = await this._candidates(scope);
    const hits = [];
    for (const c of candidates) {
      if (!matches(c.doc, scope)) {
        continue;
      }
      for (const field of this._searchable) {
        const value = getPath(c.doc, field);
        if (typeof value === 'string' && value.toLowerCase().includes(terms)) {
          hits.push(this._hydrate({ ...c.doc }));
          break;
        }
      }
    }
    return { hits };
  }

  async syncWithMeili() {
    /* no-op: MeiliSearch sync disabled under Base adapter (Phase 2 FTS). */
  }

  async bulkWrite(operations = []) {
    const result = {
      insertedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
      deletedCount: 0,
      upsertedCount: 0,
      upsertedIds: {},
      insertedIds: {},
    };
    for (const op of operations) {
      if (op.insertOne) {
        const doc = await this._create(op.insertOne.document);
        result.insertedIds[result.insertedCount] = doc._id;
        result.insertedCount += 1;
      } else if (op.updateOne) {
        const { filter, update, upsert, timestamps } = op.updateOne;
        const r = await this._updateOneInternal(filter, update, { upsert, timestamps });
        result.matchedCount += r.matched;
        result.modifiedCount += r.modified;
        if (r.upserted) {
          result.upsertedIds[result.upsertedCount] = r.doc._id;
          result.upsertedCount += 1;
        }
      } else if (op.updateMany) {
        const { filter, update, upsert, timestamps } = op.updateMany;
        const r = await this.updateMany(filter, update, { upsert, timestamps });
        result.matchedCount += r.matchedCount;
        result.modifiedCount += r.modifiedCount;
        result.upsertedCount += r.upsertedCount || 0;
      } else if (op.deleteOne) {
        const r = await this._deleteWhere(op.deleteOne.filter, 1);
        result.deletedCount += r.deletedCount;
      } else if (op.deleteMany) {
        const r = await this._deleteWhere(op.deleteMany.filter, 0);
        result.deletedCount += r.deletedCount;
      }
    }
    return result;
  }

  /** Minimal aggregation engine (used by Prompt / agentCategory, not the hot path). */
  async aggregate(pipeline = []) {
    const candidates = await this._candidates({});
    let docs = candidates.map((c) => this._hydrate({ ...c.doc }));
    for (const stage of pipeline) {
      const op = Object.keys(stage)[0];
      const arg = stage[op];
      switch (op) {
        case '$match':
          docs = docs.filter((d) => matches(d, arg));
          break;
        case '$sort':
          docs = sortDocs(docs, arg);
          break;
        case '$limit':
          docs = docs.slice(0, arg);
          break;
        case '$skip':
          docs = docs.slice(arg);
          break;
        case '$count':
          docs = [{ [arg]: docs.length }];
          break;
        case '$project':
          docs = docs.map((d) => applyProjection(d, parseProjection(arg)));
          break;
        case '$unwind': {
          const field = (typeof arg === 'string' ? arg : arg.path).replace(/^\$/, '');
          const next = [];
          for (const d of docs) {
            const v = getPath(d, field);
            if (Array.isArray(v)) {
              for (const item of v) {
                next.push({ ...d, [field]: item });
              }
            } else if (v !== undefined) {
              next.push(d);
            }
          }
          docs = next;
          break;
        }
        case '$group':
          docs = groupStage(docs, arg);
          break;
        default:
          throw new Error(`[BaseModel.aggregate] Unsupported stage: ${op}`);
      }
    }
    return docs;
  }
}

/** $group implementation for the aggregation engine. */
function groupStage(docs, spec) {
  const { _id: idSpec, ...accs } = spec;
  const groups = new Map();
  const keyOf = (d) => {
    if (idSpec === null) {
      return '__null__';
    }
    if (typeof idSpec === 'string' && idSpec.startsWith('$')) {
      return JSON.stringify(getPath(d, idSpec.slice(1)) ?? null);
    }
    return JSON.stringify(idSpec);
  };
  const idValue = (d) => {
    if (idSpec === null) {
      return null;
    }
    if (typeof idSpec === 'string' && idSpec.startsWith('$')) {
      return getPath(d, idSpec.slice(1)) ?? null;
    }
    return idSpec;
  };
  for (const d of docs) {
    const k = keyOf(d);
    if (!groups.has(k)) {
      groups.set(k, { _id: idValue(d), _docs: [] });
    }
    groups.get(k)._docs.push(d);
  }
  const out = [];
  for (const g of groups.values()) {
    const row = { _id: g._id };
    for (const [field, acc] of Object.entries(accs)) {
      const accOp = Object.keys(acc)[0];
      const expr = acc[accOp];
      const values = g._docs.map((d) =>
        typeof expr === 'string' && expr.startsWith('$') ? getPath(d, expr.slice(1)) : expr,
      );
      switch (accOp) {
        case '$sum':
          row[field] = values.reduce((s, v) => s + (Number(v) || (expr === 1 ? 1 : 0)), 0);
          break;
        case '$count':
          row[field] = g._docs.length;
          break;
        case '$avg':
          row[field] = values.reduce((s, v) => s + (Number(v) || 0), 0) / (values.length || 1);
          break;
        case '$min':
          row[field] = values.reduce((m, v) => (m == null || v < m ? v : m), null);
          break;
        case '$max':
          row[field] = values.reduce((m, v) => (m == null || v > m ? v : m), null);
          break;
        case '$first':
          row[field] = values[0];
          break;
        case '$last':
          row[field] = values[values.length - 1];
          break;
        case '$push':
          row[field] = values;
          break;
        case '$addToSet':
          row[field] = [...new Set(values)];
          break;
        default:
          throw new Error(`[BaseModel.aggregate] Unsupported accumulator: ${accOp}`);
      }
    }
    out.push(row);
  }
  return out;
}

/**
 * Query — a lazy, chainable, thenable wrapper mirroring the Mongoose Query API
 * subset in use: select / sort / limit / skip / lean / populate / collation,
 * plus terminal execution when awaited (or via .then/.exec).
 */
class Query {
  constructor(model, op, params) {
    this.model = model;
    this.op = op;
    this.params = params;
    this._projection = params.projection;
    this._sort = null;
    this._limit = null;
    this._skip = null;
    this._lean = false;
  }

  select(projection) {
    this._projection = projection;
    return this;
  }

  sort(spec) {
    this._sort = spec;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  skip(n) {
    this._skip = n;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  populate() {
    return this; // refs are stored inline as ids; no server-side population
  }

  collation() {
    return this;
  }

  hint() {
    return this;
  }

  read() {
    return this;
  }

  /** Merge an additional filter (Mongoose `Model.find(A).find(B)` / `.deleteMany(B)`). */
  find(extra) {
    this.params.filter = mergeFilter(this.params.filter, extra);
    return this;
  }

  /** `Model.find(A).deleteMany(B)` — delete with merged conditions. */
  deleteMany(extra) {
    const filter = mergeFilter(this.params.filter, extra);
    return this.model._deleteWhere(filter, 0);
  }

  deleteOne(extra) {
    const filter = mergeFilter(this.params.filter, extra);
    return this.model._deleteWhere(filter, 1);
  }

  countDocuments() {
    return this.model.countDocuments(this.params.filter);
  }

  async _run() {
    const model = this.model;
    if (this.op === 'findOneAndUpdate') {
      const r = await model._updateOneInternal(
        this.params.filter,
        this.params.update,
        this.params.options,
      );
      // Mongoose returns the pre-update doc when `new` is not truthy (default),
      // and the post-update doc when `{ new: true }`. Upserts with `new:false`
      // return null (there was no prior document).
      const wantNew = !!(this.params.options && this.params.options.new);
      let doc = wantNew ? r.doc : r.upserted ? null : r.before;
      if (!doc) {
        return null;
      }
      doc = applyProjection(doc, parseProjection(this._projection), model._deselected);
      return this._lean ? doc : makeDocument(model, doc);
    }
    if (this.op === 'findOneAndDelete') {
      const candidates = await model._candidates(this.params.filter);
      const hit = candidates.find((c) => matches(c.doc, this.params.filter));
      if (!hit) {
        return null;
      }
      await model.store.delete(model.collectionName, hit.baseId);
      const doc = applyProjection(
        model._hydrate({ ...hit.doc }),
        parseProjection(this._projection),
        model._deselected,
      );
      return this._lean ? doc : makeDocument(model, doc);
    }

    // read path (find / findOne)
    const candidates = await model._candidates(this.params.filter);
    let docs = candidates.filter((c) => matches(c.doc, this.params.filter)).map((c) => c.doc);
    if (this._sort) {
      docs = sortDocs(docs, this._sort);
    }
    if (this._skip) {
      docs = docs.slice(this._skip);
    }
    if (this.op === 'findOne') {
      const doc = docs[0];
      if (!doc) {
        return null;
      }
      const out = applyProjection(
        model._hydrate({ ...doc }),
        parseProjection(this._projection),
        model._deselected,
      );
      return this._lean ? out : makeDocument(model, out);
    }
    if (this._limit != null) {
      docs = docs.slice(0, this._limit);
    }
    const projection = parseProjection(this._projection);
    const out = docs.map((d) =>
      applyProjection(model._hydrate({ ...d }), projection, model._deselected),
    );
    return this._lean ? out : out.map((d) => makeDocument(model, d));
  }

  exec() {
    return this._run();
  }

  then(onFulfilled, onRejected) {
    return this._run().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this._run().catch(onRejected);
  }

  finally(onFinally) {
    return this._run().finally(onFinally);
  }
}

function mergeFilter(a, b) {
  if (!b || !Object.keys(b).length) {
    return a;
  }
  if (!a || !Object.keys(a).length) {
    return b;
  }
  return { $and: [a, b] };
}

/**
 * Wrap a plain doc as a lightweight "document": all data fields are enumerable
 * (so spreads, `.map`, JSON all behave), while toObject/save/etc. are hidden.
 */
function makeDocument(model, doc) {
  if (doc == null) {
    return doc;
  }
  const defineHidden = (name, value) =>
    Object.defineProperty(doc, name, { value, enumerable: false, writable: true, configurable: true });

  defineHidden('toObject', function toObject() {
    const plain = {};
    for (const k of Object.keys(this)) {
      plain[k] = this[k];
    }
    return plain;
  });
  defineHidden('toJSON', doc.toObject);
  defineHidden('save', async function save() {
    const candidates = await model._candidates({ _id: this._id });
    const plain = this.toObject();
    const hit = candidates.find((c) => c.doc._id === this._id);
    if (hit) {
      await model._replace(hit.baseId, plain, { touch: true });
    } else {
      await model._insert(model._newDoc(plain));
    }
    return this;
  });
  defineHidden('deleteOne', async function deleteOne() {
    return model._deleteWhere({ _id: this._id }, 1);
  });
  if (doc._id !== undefined) {
    defineHidden('id', String(doc._id));
  }
  return doc;
}

/** Static methods exposed on the constructor returned by `mongoose.model()`. */
const MODEL_STATICS = [
  'find',
  'findOne',
  'findById',
  'findOneAndUpdate',
  'findByIdAndUpdate',
  'findOneAndDelete',
  'create',
  'insertMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
  'estimatedDocumentCount',
  'distinct',
  'exists',
  'bulkWrite',
  'aggregate',
  'meiliSearch',
  'syncWithMeili',
  'ensure',
];

/**
 * Wrap a BaseModel as a Mongoose-style model constructor:
 *   - `new Model(data)` creates an unsaved document (with `.save()`)
 *   - `Model.find(...)`, `Model.findOneAndUpdate(...)`, … are the statics
 */
function makeModelCtor(baseModel) {
  function ModelCtor(data) {
    return baseModel._newDocument(data);
  }
  for (const name of MODEL_STATICS) {
    ModelCtor[name] = baseModel[name].bind(baseModel);
  }
  ModelCtor.modelName = baseModel.modelName;
  ModelCtor.schema = baseModel.schema;
  ModelCtor.collection = baseModel.collection;
  ModelCtor.base = baseModel;
  return ModelCtor;
}

module.exports = { BaseModel, Query, makeDocument, makeModelCtor };
