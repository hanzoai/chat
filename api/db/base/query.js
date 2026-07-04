'use strict';

/**
 * A small, correct MongoDB query/update engine used by the Hanzo Base adapter.
 *
 * The Base document store keeps each document as a JSON blob; filtering,
 * update-operator application, projection and sorting all run here in JS.
 * This is the correctness backstop for the whole adapter: any Mongo filter the
 * LibreChat data layer produces is evaluated here, so translation to Base's
 * filter DSL (see store.js) is only ever a best-effort pushdown optimisation.
 */

/** Resolve a possibly-dotted path against a document. */
function getPath(doc, path) {
  if (doc == null) {
    return undefined;
  }
  if (!path.includes('.')) {
    return doc[path];
  }
  let cur = doc;
  for (const part of path.split('.')) {
    if (cur == null) {
      return undefined;
    }
    cur = cur[part];
  }
  return cur;
}

/** Set a possibly-dotted path on a document (mutates). */
function setPath(doc, path, value) {
  if (!path.includes('.')) {
    doc[path] = value;
    return;
  }
  const parts = path.split('.');
  let cur = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/** Delete a possibly-dotted path (mutates). */
function unsetPath(doc, path) {
  if (!path.includes('.')) {
    delete doc[path];
    return;
  }
  const parts = path.split('.');
  let cur = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null) {
      return;
    }
    cur = cur[parts[i]];
  }
  delete cur[parts[parts.length - 1]];
}

/** Coerce ObjectId-like objects (Mongo ObjectId, wrappers) to their hex string. */
function idString(value) {
  if (value && typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }
  return value;
}

/** Coerce a value to a comparable primitive (Date -> ms, ObjectId -> hex). */
function comparable(value) {
  value = idString(value);
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    // ISO date strings sort correctly lexicographically, but to compare against
    // Date values we normalise anything that parses as a date to ms.
    const t = Date.parse(value);
    if (!Number.isNaN(t) && /\d{4}-\d{2}-\d{2}T/.test(value)) {
      return t;
    }
  }
  return value;
}

/** Deep-ish equality sufficient for query matching (primitives, dates, arrays, plain objects). */
function valueEquals(a, b) {
  a = idString(a);
  b = idString(b);
  if (a === b) {
    return true;
  }
  if (a instanceof Date || b instanceof Date) {
    return comparable(a) === comparable(b);
  }
  if (a == null || b == null) {
    return a == null && b == null;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => valueEquals(x, b[i]));
  }
  return false;
}

function compare(a, b) {
  const ca = comparable(a);
  const cb = comparable(b);
  if (ca == null && cb == null) {
    return 0;
  }
  if (ca == null) {
    return -1;
  }
  if (cb == null) {
    return 1;
  }
  if (ca < cb) {
    return -1;
  }
  if (ca > cb) {
    return 1;
  }
  return 0;
}

function toRegExp(spec, options) {
  if (spec instanceof RegExp) {
    return spec;
  }
  return new RegExp(spec, options || '');
}

/** Evaluate a single field's operator expression against a document value. */
function matchOperators(fieldValue, expr) {
  // Array-aware equality helper: a field matches a scalar if it equals it, or
  // (when the field is an array) if the array contains it — Mongo semantics.
  const eq = (target) => {
    if (Array.isArray(fieldValue) && !Array.isArray(target)) {
      return fieldValue.some((v) => valueEquals(v, target));
    }
    return valueEquals(fieldValue, target);
  };

  if (expr instanceof RegExp) {
    return typeof fieldValue === 'string' && expr.test(fieldValue);
  }
  if (expr === null || typeof expr !== 'object' || expr instanceof Date || Array.isArray(expr)) {
    return eq(expr);
  }

  const keys = Object.keys(expr);
  const isOperatorExpr = keys.some((k) => k.startsWith('$'));
  if (!isOperatorExpr) {
    return eq(expr);
  }

  for (const op of keys) {
    const operand = expr[op];
    switch (op) {
      case '$eq':
        if (!eq(operand)) return false;
        break;
      case '$ne':
        if (eq(operand)) return false;
        break;
      case '$in': {
        const arr = operand || [];
        const hit = Array.isArray(fieldValue)
          ? fieldValue.some((v) => arr.some((o) => valueEquals(v, o)))
          : arr.some((o) => valueEquals(fieldValue, o));
        if (!hit) return false;
        break;
      }
      case '$nin': {
        const arr = operand || [];
        const hit = Array.isArray(fieldValue)
          ? fieldValue.some((v) => arr.some((o) => valueEquals(v, o)))
          : arr.some((o) => valueEquals(fieldValue, o));
        if (hit) return false;
        break;
      }
      case '$gt':
        if (fieldValue === undefined || compare(fieldValue, operand) <= 0) return false;
        break;
      case '$gte':
        if (fieldValue === undefined || compare(fieldValue, operand) < 0) return false;
        break;
      case '$lt':
        if (fieldValue === undefined || compare(fieldValue, operand) >= 0) return false;
        break;
      case '$lte':
        if (fieldValue === undefined || compare(fieldValue, operand) > 0) return false;
        break;
      case '$exists':
        if ((fieldValue !== undefined) !== !!operand) return false;
        break;
      case '$regex': {
        const re = toRegExp(operand, expr.$options);
        if (typeof fieldValue !== 'string' || !re.test(fieldValue)) return false;
        break;
      }
      case '$options':
        break; // handled with $regex
      case '$not':
        if (matchOperators(fieldValue, operand)) return false;
        break;
      case '$size':
        if (!Array.isArray(fieldValue) || fieldValue.length !== operand) return false;
        break;
      case '$all': {
        if (!Array.isArray(fieldValue)) return false;
        const ok = (operand || []).every((o) => fieldValue.some((v) => valueEquals(v, o)));
        if (!ok) return false;
        break;
      }
      case '$elemMatch': {
        if (!Array.isArray(fieldValue)) return false;
        if (!fieldValue.some((v) => matches(v, operand))) return false;
        break;
      }
      default:
        // Unknown operator: treat the whole expression as an equality target.
        return eq(expr);
    }
  }
  return true;
}

/**
 * Does `doc` match Mongo filter `query`?
 * @param {Record<string, unknown>} doc
 * @param {Record<string, unknown>} query
 * @returns {boolean}
 */
function matches(doc, query) {
  if (!query || typeof query !== 'object') {
    return true;
  }
  for (const key of Object.keys(query)) {
    const val = query[key];
    if (key === '$and') {
      if (!(val || []).every((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (key === '$or') {
      if (!(val || []).some((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (key === '$nor') {
      if ((val || []).some((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (key === '$not') {
      if (matches(doc, val)) return false;
      continue;
    }
    if (key.startsWith('$')) {
      continue; // unsupported top-level operator -> ignore (permissive)
    }
    if (!matchOperators(getPath(doc, key), val)) {
      return false;
    }
  }
  return true;
}

const UPDATE_OPERATORS = new Set([
  '$set',
  '$unset',
  '$inc',
  '$push',
  '$addToSet',
  '$pull',
  '$setOnInsert',
  '$min',
  '$max',
  '$mul',
  '$rename',
]);

/** Split a Mongoose-style update into operator groups, wrapping bare fields as $set. */
function normalizeUpdate(update) {
  if (!update || typeof update !== 'object') {
    return { $set: {} };
  }
  const keys = Object.keys(update);
  const hasOperator = keys.some((k) => UPDATE_OPERATORS.has(k));
  if (!hasOperator) {
    return { $set: { ...update } };
  }
  const out = {};
  const bareSet = {};
  for (const k of keys) {
    if (UPDATE_OPERATORS.has(k)) {
      out[k] = update[k];
    } else {
      bareSet[k] = update[k];
    }
  }
  if (Object.keys(bareSet).length) {
    out.$set = { ...bareSet, ...(out.$set || {}) };
  }
  return out;
}

/**
 * Apply a normalized/raw update to a document in place and return it.
 * @param {Record<string, unknown>} doc - target document (mutated)
 * @param {Record<string, unknown>} update
 * @param {{ isInsert?: boolean }} [opts]
 */
function applyUpdate(doc, update, opts = {}) {
  const ops = normalizeUpdate(update);

  if (ops.$set) {
    for (const [k, v] of Object.entries(ops.$set)) {
      setPath(doc, k, v);
    }
  }
  if (ops.$setOnInsert && opts.isInsert) {
    for (const [k, v] of Object.entries(ops.$setOnInsert)) {
      setPath(doc, k, v);
    }
  }
  if (ops.$unset) {
    for (const k of Object.keys(ops.$unset)) {
      unsetPath(doc, k);
    }
  }
  if (ops.$inc) {
    for (const [k, v] of Object.entries(ops.$inc)) {
      setPath(doc, k, (Number(getPath(doc, k)) || 0) + Number(v));
    }
  }
  if (ops.$mul) {
    for (const [k, v] of Object.entries(ops.$mul)) {
      setPath(doc, k, (Number(getPath(doc, k)) || 0) * Number(v));
    }
  }
  if (ops.$min) {
    for (const [k, v] of Object.entries(ops.$min)) {
      const cur = getPath(doc, k);
      if (cur === undefined || compare(v, cur) < 0) setPath(doc, k, v);
    }
  }
  if (ops.$max) {
    for (const [k, v] of Object.entries(ops.$max)) {
      const cur = getPath(doc, k);
      if (cur === undefined || compare(v, cur) > 0) setPath(doc, k, v);
    }
  }
  if (ops.$push) {
    for (const [k, v] of Object.entries(ops.$push)) {
      const arr = Array.isArray(getPath(doc, k)) ? getPath(doc, k) : [];
      if (v && typeof v === 'object' && Array.isArray(v.$each)) {
        arr.push(...v.$each);
      } else {
        arr.push(v);
      }
      setPath(doc, k, arr);
    }
  }
  if (ops.$addToSet) {
    for (const [k, v] of Object.entries(ops.$addToSet)) {
      const arr = Array.isArray(getPath(doc, k)) ? getPath(doc, k) : [];
      const items = v && typeof v === 'object' && Array.isArray(v.$each) ? v.$each : [v];
      for (const item of items) {
        if (!arr.some((x) => valueEquals(x, item))) arr.push(item);
      }
      setPath(doc, k, arr);
    }
  }
  if (ops.$pull) {
    for (const [k, cond] of Object.entries(ops.$pull)) {
      const arr = getPath(doc, k);
      if (Array.isArray(arr)) {
        setPath(
          doc,
          k,
          arr.filter((x) =>
            cond && typeof cond === 'object' && !Array.isArray(cond)
              ? !matchOperators(x, cond)
              : !valueEquals(x, cond),
          ),
        );
      }
    }
  }
  if (ops.$rename) {
    for (const [from, to] of Object.entries(ops.$rename)) {
      const v = getPath(doc, from);
      unsetPath(doc, from);
      setPath(doc, to, v);
    }
  }
  return doc;
}

/**
 * Parse a projection spec (space string or object) into
 * { plain:Set, plus:Set, exclude:Set } or null for no projection.
 *   - `field`  -> plain inclusion
 *   - `+field` -> force-include a `select:false` field on top of the default set
 *   - `-field` -> exclusion
 */
function parseProjection(spec) {
  if (!spec) {
    return null;
  }
  const plain = new Set();
  const plus = new Set();
  const exclude = new Set();
  if (typeof spec === 'string') {
    for (const token of spec.split(/\s+/).filter(Boolean)) {
      if (token.startsWith('-')) {
        exclude.add(token.slice(1));
      } else if (token.startsWith('+')) {
        plus.add(token.slice(1));
      } else {
        plain.add(token);
      }
    }
  } else if (typeof spec === 'object') {
    for (const [k, v] of Object.entries(spec)) {
      if (v) {
        plain.add(k);
      } else {
        exclude.add(k);
      }
    }
  }
  if (!plain.size && !plus.size && !exclude.size) {
    return null;
  }
  return { plain, plus, exclude };
}

/**
 * Apply a parsed projection with Mongoose `select:false` semantics, returning a
 * new object. `deselected` are fields excluded from reads by default (secrets).
 */
function applyProjection(doc, projection, deselected) {
  const hidden = deselected || EMPTY_SET;
  // No projection: default view = everything minus deselected (secrets).
  if (!projection) {
    if (!hidden.size) {
      return doc;
    }
    const out = { ...doc };
    for (const f of hidden) {
      unsetPath(out, f);
    }
    return out;
  }
  // Inclusion mode: return only the named fields (+plus), _id unless -_id.
  if (projection.plain.size) {
    const fields = new Set([...projection.plain, ...projection.plus]);
    if (!projection.exclude.has('_id')) {
      fields.add('_id');
    }
    const out = {};
    for (const f of fields) {
      const v = getPath(doc, f);
      if (v !== undefined) {
        setPath(out, f, v);
      }
    }
    return out;
  }
  // Default + adjustments: base minus deselected (unless +included) minus -excluded.
  const out = { ...doc };
  for (const f of hidden) {
    if (!projection.plus.has(f)) {
      unsetPath(out, f);
    }
  }
  for (const f of projection.exclude) {
    unsetPath(out, f);
  }
  return out;
}

const EMPTY_SET = new Set();

/** Sort documents by a Mongo sort spec ({ field: 1|-1 }). Returns a new array. */
function sortDocs(docs, sortSpec) {
  if (!sortSpec || !Object.keys(sortSpec).length) {
    return docs;
  }
  const keys = Object.entries(sortSpec).map(([k, v]) => [k, v === -1 || v === 'desc' ? -1 : 1]);
  return [...docs].sort((a, b) => {
    for (const [k, dir] of keys) {
      const c = compare(getPath(a, k), getPath(b, k));
      if (c !== 0) {
        return c * dir;
      }
    }
    return 0;
  });
}

module.exports = {
  matches,
  applyUpdate,
  normalizeUpdate,
  parseProjection,
  applyProjection,
  sortDocs,
  getPath,
  setPath,
  unsetPath,
  valueEquals,
  compare,
  idString,
};
