/**
 * Pure document-store engine: Mongo-shaped query matching, update application,
 * projection, and sorting over plain JS objects. No I/O, no SQLite, no mongoose.
 *
 * This is the correctness core of the SQLite-backed store. Keeping it pure and
 * dependency-free makes the Mongo semantics exhaustively unit-testable and lets
 * the storage layer (DocModel) stay a thin SQLite adapter around it.
 *
 * Supported operators are exactly the surface the migrated chat data methods
 * use, plus the cheap adjacent ones so the engine is reusable across the
 * remaining collections without re-touching this file:
 *   filter:  $eq $ne $in $nin $gt $gte $lt $lte $exists $regex $not $and $or $nor
 *   update:  (implicit $set) $set $unset $setOnInsert $inc $push $pull $addToSet
 */
import { randomBytes } from 'node:crypto';

export type Doc = Record<string, unknown>;
export type Filter = Record<string, unknown>;
export type Update = Record<string, unknown>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/* ------------------------------------------------------------------ paths */

export function getPath(doc: Doc, path: string): unknown {
  if (!path.includes('.')) {
    return doc[path];
  }
  let cur: unknown = doc;
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') {
      return undefined;
    }
    cur = (cur as Doc)[key];
  }
  return cur;
}

export function hasPath(doc: Doc, path: string): boolean {
  if (!path.includes('.')) {
    return Object.prototype.hasOwnProperty.call(doc, path);
  }
  let cur: unknown = doc;
  const keys = path.split('.');
  for (let i = 0; i < keys.length; i++) {
    if (cur == null || typeof cur !== 'object') {
      return false;
    }
    if (i === keys.length - 1) {
      return Object.prototype.hasOwnProperty.call(cur, keys[i]);
    }
    cur = (cur as Doc)[keys[i]];
  }
  return false;
}

/**
 * Keys that must never be walked or written through a dotted update path:
 * writing `__proto__.x` or `constructor.prototype.x` would mutate a shared
 * prototype (prototype pollution). Update keys are attacker-influenced — they
 * arrive verbatim from `$set`/`$unset`/`$inc`/`$push`/… documents (conversation
 * import, `saveConvo`, agent metadata) — so a malicious dotted key is neutralised
 * here rather than trusted. A path containing any unsafe segment is a no-op.
 */
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function hasUnsafeSegment(keys: string[]): boolean {
  return keys.some((k) => UNSAFE_KEYS.has(k));
}

function setPath(doc: Doc, path: string, value: unknown): void {
  if (!path.includes('.')) {
    if (UNSAFE_KEYS.has(path)) {
      return;
    }
    doc[path] = value;
    return;
  }
  const keys = path.split('.');
  if (hasUnsafeSegment(keys)) {
    return;
  }
  let cur: Doc = doc;
  for (let i = 0; i < keys.length - 1; i++) {
    const next = cur[keys[i]];
    if (next == null || typeof next !== 'object') {
      cur[keys[i]] = {};
    }
    cur = cur[keys[i]] as Doc;
  }
  cur[keys[keys.length - 1]] = value;
}

function deletePath(doc: Doc, path: string): void {
  if (!path.includes('.')) {
    if (UNSAFE_KEYS.has(path)) {
      return;
    }
    delete doc[path];
    return;
  }
  const keys = path.split('.');
  if (hasUnsafeSegment(keys)) {
    return;
  }
  let cur: Doc = doc;
  for (let i = 0; i < keys.length - 1; i++) {
    const next = cur[keys[i]];
    if (next == null || typeof next !== 'object') {
      return;
    }
    cur = next as Doc;
  }
  delete cur[keys[keys.length - 1]];
}

/* ------------------------------------------------------------ comparison */

/**
 * Coerces a BSON ObjectId (real mongoose, or any `{ toHexString() }`) to its hex
 * string, so filters carrying ObjectId operands compare against the hex strings
 * this store persists (docs stringify ObjectIds to hex on write; `_id`s are
 * generated in ObjectId-hex format). Leaves everything else untouched.
 */
export function coerceId(v: unknown): unknown {
  if (v != null && typeof v === 'object') {
    const o = v as { toHexString?: () => string; _bsontype?: string };
    if (typeof o.toHexString === 'function') {
      return o.toHexString();
    }
  }
  return v;
}

/**
 * Recursively coerces ObjectId-like values (real mongoose or the shim) to their
 * hex string. Used on input documents before `structuredClone` — which would
 * otherwise strip an ObjectId's methods, leaving a `{ }`-shaped husk that
 * serializes wrong. Dates and everything else pass through untouched.
 */
export function deepCoerceIds(v: unknown): unknown {
  if (v == null || typeof v !== 'object') {
    return v;
  }
  if (typeof (v as { toHexString?: () => string }).toHexString === 'function') {
    return (v as { toHexString: () => string }).toHexString();
  }
  if (v instanceof Date) {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map(deepCoerceIds);
  }
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    out[k] = deepCoerceIds(val);
  }
  return out;
}

/** Coerce a value to a comparable primitive: dates/ISO-strings -> epoch ms. */
function comparable(raw: unknown): number | string | boolean | null {
  const v = coerceId(raw);
  if (v == null) {
    return null;
  }
  if (v instanceof Date) {
    return v.getTime();
  }
  if (typeof v === 'string' && ISO_DATE.test(v)) {
    return Date.parse(v);
  }
  if (typeof v === 'boolean') {
    return v;
  }
  return v as number | string;
}

/** Ordering comparator. null sorts lowest. Returns -1 | 0 | 1. */
export function compareValues(a: unknown, b: unknown): number {
  const ca = comparable(a);
  const cb = comparable(b);
  if (ca === null && cb === null) {
    return 0;
  }
  if (ca === null) {
    return -1;
  }
  if (cb === null) {
    return 1;
  }
  if (typeof ca === 'number' && typeof cb === 'number') {
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  }
  const sa = String(ca);
  const sb = String(cb);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function valueEquals(rawA: unknown, rawB: unknown): boolean {
  const a = coerceId(rawA);
  const b = coerceId(rawB);
  if (a instanceof Date || b instanceof Date || isIsoDate(a) || isIsoDate(b)) {
    const ca = comparable(a);
    const cb = comparable(b);
    if (typeof ca === 'number' && typeof cb === 'number') {
      return ca === cb;
    }
  }
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return a == null && b == null;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function isIsoDate(v: unknown): boolean {
  return typeof v === 'string' && ISO_DATE.test(v);
}

/**
 * Casts a comparison operand to match the stored value's type, mirroring
 * Mongoose's schema-driven query casting. The critical case: cursor pagination
 * passes `String(date)` (a non-ISO `Date.toString()`) as a range operand against
 * a Date field — coerce it back to a Date so the comparison is chronological,
 * not lexical. Non-date strings are left untouched.
 */
function coerceOperand(ref: unknown, operand: unknown): unknown {
  if (ref instanceof Date && typeof operand === 'string') {
    const t = Date.parse(operand);
    if (!Number.isNaN(t)) {
      return new Date(t);
    }
  }
  return operand;
}

/* --------------------------------------------------------------- matching */

/** Mongo equality: {field: value}. Array fields match on membership. */
function matchEquality(docVal: unknown, value: unknown): boolean {
  if (value === null) {
    // {field: null} matches null OR missing (missing => docVal === undefined)
    return docVal == null;
  }
  if (Array.isArray(docVal) && !Array.isArray(value)) {
    return docVal.some((el) => valueEquals(el, value));
  }
  return valueEquals(docVal, value);
}

function matchOperator(docVal: unknown, op: string, operand: unknown, present: boolean): boolean {
  switch (op) {
    case '$eq':
      return matchEquality(docVal, operand);
    case '$ne':
      return !matchEquality(docVal, operand);
    case '$in': {
      const arr = operand as unknown[];
      if (Array.isArray(docVal)) {
        return docVal.some((el) => arr.some((o) => valueEquals(el, o)));
      }
      return arr.some((o) => matchEquality(docVal, o));
    }
    case '$nin': {
      const arr = operand as unknown[];
      if (Array.isArray(docVal)) {
        return !docVal.some((el) => arr.some((o) => valueEquals(el, o)));
      }
      return !arr.some((o) => matchEquality(docVal, o));
    }
    case '$gt':
      return docVal != null && compareValues(docVal, coerceOperand(docVal, operand)) > 0;
    case '$gte':
      return docVal != null && compareValues(docVal, coerceOperand(docVal, operand)) >= 0;
    case '$lt':
      return docVal != null && compareValues(docVal, coerceOperand(docVal, operand)) < 0;
    case '$lte':
      return docVal != null && compareValues(docVal, coerceOperand(docVal, operand)) <= 0;
    case '$exists':
      return operand ? present : !present;
    case '$regex': {
      if (typeof docVal !== 'string') {
        return false;
      }
      const re =
        operand instanceof RegExp ? operand : new RegExp(operand as string);
      return re.test(docVal);
    }
    case '$not': {
      // operand is an operator object or regex
      if (operand instanceof RegExp) {
        return !(typeof docVal === 'string' && operand.test(docVal));
      }
      return !matchFieldConditions(docVal, operand as Record<string, unknown>, present);
    }
    case '$bitsAllSet':
    case '$bitsAnySet':
    case '$bitsAllClear':
    case '$bitsAnyClear': {
      if (typeof docVal !== 'number') {
        return false;
      }
      const mask = Array.isArray(operand)
        ? (operand as number[]).reduce((m, bit) => m | (1 << bit), 0)
        : (operand as number);
      const set = docVal & mask;
      if (op === '$bitsAllSet') return set === mask;
      if (op === '$bitsAnySet') return set !== 0;
      if (op === '$bitsAllClear') return set === 0;
      return set !== mask; // $bitsAnyClear
    }
    case '$size':
      return Array.isArray(docVal) && docVal.length === operand;
    case '$all':
      return (
        Array.isArray(docVal) &&
        (operand as unknown[]).every((o) => docVal.some((el) => valueEquals(el, o)))
      );
    case '$elemMatch':
      return (
        Array.isArray(docVal) &&
        docVal.some((el) => matchesFilter(el as Doc, operand as Filter))
      );
    default:
      // Unknown operator on a field is treated as an equality against the
      // operator object (mongo would error; we fail closed to no-match).
      return false;
  }
}

function isOperatorObject(v: unknown): boolean {
  if (v == null || typeof v !== 'object' || Array.isArray(v) || v instanceof Date) {
    return false;
  }
  const keys = Object.keys(v as object);
  return keys.length > 0 && keys.every((k) => k.startsWith('$'));
}

function matchFieldConditions(
  docVal: unknown,
  conditions: Record<string, unknown>,
  present: boolean,
): boolean {
  for (const [op, operand] of Object.entries(conditions)) {
    if (!matchOperator(docVal, op, operand, present)) {
      return false;
    }
  }
  return true;
}

/** Returns true if `doc` satisfies the Mongo-shaped `filter`. */
export function matchesFilter(doc: Doc, filter: Filter): boolean {
  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$and') {
      if (!(cond as Filter[]).every((f) => matchesFilter(doc, f))) {
        return false;
      }
    } else if (key === '$or') {
      if (!(cond as Filter[]).some((f) => matchesFilter(doc, f))) {
        return false;
      }
    } else if (key === '$nor') {
      if ((cond as Filter[]).some((f) => matchesFilter(doc, f))) {
        return false;
      }
    } else {
      const docVal = getPath(doc, key);
      const present = hasPath(doc, key);
      if (isOperatorObject(cond)) {
        if (!matchFieldConditions(docVal, cond as Record<string, unknown>, present)) {
          return false;
        }
      } else if (!matchEquality(docVal, cond)) {
        return false;
      }
    }
  }
  return true;
}

/* ---------------------------------------------------------------- updates */

/** True if the update document uses operator syntax ($set, $inc, ...). */
export function isOperatorUpdate(update: Update): boolean {
  return Object.keys(update).some((k) => k.startsWith('$'));
}

/**
 * Normalizes an update to pure operator form. A plain update becomes `$set`.
 * A mixed update (top-level fields alongside operators, e.g. `{a:1, $setOnInsert}`)
 * folds the plain fields into `$set` — mongoose's semantics.
 */
function normalizeUpdate(update: Update): Update {
  if (!isOperatorUpdate(update)) {
    return { $set: update };
  }
  const operators: Update = {};
  const implicitSet: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(update)) {
    if (k.startsWith('$')) {
      operators[k] = v;
    } else {
      implicitSet[k] = v;
    }
  }
  if (Object.keys(implicitSet).length > 0) {
    operators.$set = { ...implicitSet, ...((operators.$set as Record<string, unknown>) ?? {}) };
  }
  return operators;
}

/** Equality clauses of a filter, used to seed an upsert-inserted document. */
export function equalitySeed(filter: Filter): Doc {
  const seed: Doc = {};
  for (const [key, cond] of Object.entries(filter)) {
    if (key.startsWith('$')) {
      continue;
    }
    if (!isOperatorObject(cond)) {
      seed[key] = cond;
    }
  }
  return seed;
}

/**
 * Applies a Mongo-shaped update to a base document, returning a new document.
 * `$setOnInsert` is applied only when `isInsert` is true.
 */
export function applyUpdate(base: Doc, update: Update, isInsert: boolean): Doc {
  // deepCoerceIds first: an upsert seed (equalitySeed of a filter) can carry
  // ObjectId shims, which structuredClone would strip to a husk. No-op for
  // already-stored docs (hex strings + Dates pass through untouched).
  const doc: Doc = structuredClone(deepCoerceIds(base) as Doc);
  const ops: Update = normalizeUpdate(update);

  for (const [op, payload] of Object.entries(ops)) {
    const fields = payload as Record<string, unknown>;
    switch (op) {
      case '$set':
        for (const [k, v] of Object.entries(fields)) {
          setPath(doc, k, v);
        }
        break;
      case '$setOnInsert':
        if (isInsert) {
          for (const [k, v] of Object.entries(fields)) {
            setPath(doc, k, v);
          }
        }
        break;
      case '$unset':
        for (const k of Object.keys(fields)) {
          deletePath(doc, k);
        }
        break;
      case '$inc':
        for (const [k, v] of Object.entries(fields)) {
          setPath(doc, k, ((getPath(doc, k) as number) ?? 0) + (v as number));
        }
        break;
      case '$push':
        for (const [k, v] of Object.entries(fields)) {
          const arr = (getPath(doc, k) as unknown[]) ?? [];
          const each = isEachSpec(v) ? (v as { $each: unknown[] }).$each : [v];
          setPath(doc, k, [...arr, ...each]);
        }
        break;
      case '$addToSet':
        for (const [k, v] of Object.entries(fields)) {
          const arr = ((getPath(doc, k) as unknown[]) ?? []).slice();
          const each = isEachSpec(v) ? (v as { $each: unknown[] }).$each : [v];
          for (const el of each) {
            if (!arr.some((x) => valueEquals(x, el))) {
              arr.push(el);
            }
          }
          setPath(doc, k, arr);
        }
        break;
      case '$pull':
        for (const [k, v] of Object.entries(fields)) {
          const arr = (getPath(doc, k) as unknown[]) ?? [];
          const pred = isOperatorObject(v)
            ? (el: unknown) => matchFieldConditions(el, v as Record<string, unknown>, true)
            : (el: unknown) => matchEquality(el, v);
          setPath(
            doc,
            k,
            arr.filter((el) => !pred(el)),
          );
        }
        break;
      case '$pullAll':
        for (const [k, v] of Object.entries(fields)) {
          const arr = (getPath(doc, k) as unknown[]) ?? [];
          const remove = v as unknown[];
          setPath(
            doc,
            k,
            arr.filter((el) => !remove.some((r) => valueEquals(el, r))),
          );
        }
        break;
      default:
        // Non-operator key in an operator update is ignored (mongo rejects the
        // mix). Callers in this codebase never mix, so this is unreachable.
        break;
    }
  }
  return doc;
}

function isEachSpec(v: unknown): boolean {
  return (
    v != null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.prototype.hasOwnProperty.call(v, '$each')
  );
}

/* ----------------------------------------------------- projection & sort */

/**
 * Applies a Mongo string projection ('a b -c') or object projection.
 * Inclusion projections always keep `_id` unless explicitly excluded.
 */
interface ParsedProjection {
  mode: 'inclusion' | 'exclusion' | 'none';
  /** Fields to project IN under inclusion mode: plain includes + `+` overrides. */
  include: string[];
  /** Fields to remove under exclusion mode. */
  exclude: string[];
  /** Whether `_id` survives (mongoose keeps it unless `{_id:0}` / `-_id`). */
  includeId: boolean;
  /** Fields explicitly requested (object `:1`, string bare, or `+field`) → bypass deselection. */
  requested: Set<string>;
}

/**
 * Parses a mongoose-shaped projection into inclusion/exclusion intent plus the
 * set of explicitly-requested fields. Supports the `+field` string prefix, which
 * mongoose uses to re-include a schema `select:false` (deselected) field WITHOUT
 * turning the query into an inclusion projection — so `'+totpSecret'` yields the
 * full document plus that one deselected field.
 */
function parseProjection(projection?: string | Record<string, 0 | 1>): ParsedProjection {
  const plain: string[] = [];
  const plus: string[] = [];
  const exclude: string[] = [];
  let includeId = true;
  if (typeof projection === 'string') {
    for (const raw of projection.split(/\s+/).filter(Boolean)) {
      if (raw.startsWith('+')) {
        plus.push(raw.slice(1));
      } else if (raw.startsWith('-')) {
        const f = raw.slice(1);
        if (f === '_id') {
          includeId = false; // `-_id` only drops _id; never triggers inclusion
        } else {
          exclude.push(f);
        }
      } else {
        // A bare token (including `_id`) is an inclusion field: `.select('_id')`
        // returns ONLY _id, matching mongoose.
        plain.push(raw);
      }
    }
  } else if (projection) {
    for (const [k, v] of Object.entries(projection)) {
      if (k === '_id') {
        if (v === 0) {
          includeId = false;
        } else {
          plain.push('_id'); // `{_id:1}` is an inclusion of only _id
        }
      } else if (v === 1) {
        plain.push(k);
      } else if (v === 0) {
        exclude.push(k);
      }
    }
  }
  // A bare include (plain field or object `:1`) selects inclusion mode. A projection
  // of only `-`/`+` (or object `:0`) is exclusion-from-the-full-document; a `+`
  // override alone must NOT collapse the result to just that field, so it is
  // exclusion mode with an empty exclude list.
  const mode: ParsedProjection['mode'] = plain.length
    ? 'inclusion'
    : exclude.length || plus.length
      ? 'exclusion'
      : 'none';
  return {
    mode,
    include: [...plain, ...plus],
    exclude,
    includeId,
    requested: new Set([...plain, ...plus]),
  };
}

/**
 * Deep-copies the plain-object/array STRUCTURE of a value while passing Dates and
 * any non-plain object through by reference. Used by projection: it must not
 * mutate the source doc when deleting keys, but it also must not re-instantiate
 * Dates (which `structuredClone`/JSON round-trips would), because a rebuilt Date
 * loses `instanceof Date` across realms and breaks the engine's date comparisons.
 */
function cloneStructure(v: unknown): unknown {
  if (v === null || typeof v !== 'object' || v instanceof Date) {
    return v;
  }
  if (Array.isArray(v)) {
    return v.map(cloneStructure);
  }
  // Only clone plain objects; anything exotic (Buffer, ObjectId, …) is shared.
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) {
    return v;
  }
  const out: Doc = {};
  for (const [k, val] of Object.entries(v as Doc)) {
    out[k] = cloneStructure(val);
  }
  return out;
}

/**
 * Projects a document per a mongoose-shaped `projection`, then enforces the
 * collection's `deselected` fields (schema `select:false` — secrets like
 * `totpSecret`/`keyHash`/`backupCodes` and internal flags like `_meiliIndex`):
 * any deselected field NOT explicitly requested (via a `+field` override or an
 * inclusion of it) is stripped on EVERY read. This closes the store-layer leak
 * where a projection-less read returned schema-hidden secrets that mongoose omits.
 */
export function projectDoc(
  doc: Doc,
  projection?: string | Record<string, 0 | 1>,
  deselected?: ReadonlySet<string>,
): Doc {
  const enforceDeselect = deselected != null && deselected.size > 0;
  if (!projection && !enforceDeselect) {
    return doc;
  }
  const p = parseProjection(projection);
  let out: Doc;
  if (p.mode === 'inclusion') {
    out = {};
    if (p.includeId && '_id' in doc) {
      out._id = doc._id;
    }
    for (const k of p.include) {
      if (k !== '_id' && hasPath(doc, k)) {
        setPath(out, k, getPath(doc, k));
      }
    }
  } else {
    // 'exclusion' or 'none' → start from a copy of the full document. Clone the
    // STRUCTURE (so deleting a key never mutates the stored/source doc) while
    // sharing Date (and other class) instances by reference — projection only
    // deletes keys, never mutates values. `structuredClone` is avoided on purpose:
    // it rebuilds Dates against Node's primordial realm, so the result would fail
    // `instanceof Date` under a test/VM realm and break downstream date compares.
    out = cloneStructure(doc);
    for (const k of p.exclude) {
      deletePath(out, k);
    }
    if (!p.includeId) {
      deletePath(out, '_id');
    }
  }
  if (enforceDeselect) {
    for (const f of deselected!) {
      if (!p.requested.has(f)) {
        deletePath(out, f);
      }
    }
  }
  return out;
}

export type SortSpec = Record<string, 1 | -1>;

/** Stable multi-key sort honoring date-aware comparison. Mutates and returns. */
export function sortDocs(docs: Doc[], sort: SortSpec): Doc[] {
  const keys = Object.entries(sort);
  if (keys.length === 0) {
    return docs;
  }
  return docs.sort((a, b) => {
    for (const [field, dir] of keys) {
      const cmp = compareValues(getPath(a, field), getPath(b, field));
      if (cmp !== 0) {
        return dir === 1 ? cmp : -cmp;
      }
    }
    return 0;
  });
}

/* -------------------------------------------------------------- id / util */

let counter = randomBytes(3).readUIntBE(0, 3);

/** Generates a 24-hex-char, roughly monotonic ObjectId-compatible identifier. */
export function objectId(): string {
  const ts = Math.floor(Date.now() / 1000);
  counter = (counter + 1) & 0xffffff;
  const tsHex = ts.toString(16).padStart(8, '0');
  const rand = randomBytes(5).toString('hex');
  const cntHex = counter.toString(16).padStart(6, '0');
  return tsHex + rand + cntHex;
}

const HEX24 = /^[0-9a-f]{24}$/i;

/**
 * Minimal BSON-ObjectId shim exposed as `handle.Types.ObjectId` for method files
 * that construct ObjectIds (Skill, MCPServer). Store `_id`s are already
 * ObjectId-hex and `coerceId` resolves this to hex for comparison/storage, so
 * this only needs to hold a hex string and stringify to it. Timestamp-prefixed
 * generation keeps `_id` ordering ~chronological (used by `_id` cursors).
 */
export class ObjectId {
  private readonly hex: string;

  constructor(id?: string | ObjectId) {
    if (id == null) {
      this.hex = objectId();
    } else if (typeof id === 'string') {
      if (!HEX24.test(id)) {
        throw new TypeError(`[sqlite-store] invalid ObjectId hex: ${id}`);
      }
      this.hex = id.toLowerCase();
    } else {
      this.hex = id.toHexString();
    }
  }

  toHexString(): string {
    return this.hex;
  }
  toString(): string {
    return this.hex;
  }
  toJSON(): string {
    return this.hex;
  }
  equals(other: unknown): boolean {
    return String(coerceId(other)) === this.hex;
  }
  static isValid(v: unknown): boolean {
    return v instanceof ObjectId || (typeof v === 'string' && HEX24.test(v));
  }
}
