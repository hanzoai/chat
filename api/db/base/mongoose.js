'use strict';

/**
 * A self-contained, `mongoose`-shaped facade backed by Hanzo Base.
 *
 * `@librechat/data-schemas` builds its schemas with real `mongoose` (a pure
 * schema DSL inside that package) and then asks a mongoose instance to turn
 * those schemas into models (`createModels`/`createMethods`). We hand it THIS
 * facade instead: it registers every model as a BaseModel persisting to Base —
 * never MongoDB — and provides just the mongoose surface the data layer uses at
 * runtime (`model`, `models`, `Types.ObjectId`, `Schema.Types`, a no-op session
 * / connection). It carries **no `mongoose` runtime dependency**; schema objects
 * are passed in already-built, so this module never imports the driver.
 *
 * Result: one adapter, and the entire data-schemas model+method surface
 * (User, Session, Token, Role, Balance, Conversation, Message, Agent, …) runs
 * on Base with zero per-model porting.
 */

const { BaseModel, makeModelCtor } = require('./model');
const { ObjectId, isValidObjectId } = require('./objectId');
const store = require('./store');

/** Shared model registry (mirrors `mongoose.models`) — values are model ctors. */
const models = {};
/** BaseModel instances keyed by name (for connectDb collection provisioning). */
const baseModels = {};

function model(name, schema) {
  if (models[name]) {
    return models[name];
  }
  if (!schema) {
    return undefined;
  }
  const base = new BaseModel(name, schema, store);
  const ctor = makeModelCtor(base);
  baseModels[name] = base;
  models[name] = ctor;
  return ctor;
}

/** No-op session: Base has no multi-document transactions (see adapter notes). */
function makeSession() {
  return {
    startTransaction() {},
    async commitTransaction() {},
    async abortTransaction() {},
    async endSession() {},
    async withTransaction(fn) {
      return fn();
    },
    inTransaction() {
      return false;
    },
  };
}

/** Connection stub — the real Base connection lives in ./index.js connectDb(). */
const connection = {
  readyState: 1,
  _readyState: 1,
  on() {},
  once() {},
  model,
  models,
  collections: {},
  async dropDatabase() {},
  async close() {},
  db: {
    async dropDatabase() {},
    collection() {
      return {};
    },
  },
};

/** Minimal Schema.Types surface for the few `mongoose.Schema.Types.*` runtime uses. */
class Mixed {}
const SchemaTypes = {
  ObjectId,
  Mixed,
  String,
  Number,
  Boolean,
  Date,
  Array,
  Buffer,
  Map,
};

const facade = {
  __isBaseFacade: true,
  model,
  models,
  connection,
  connections: [connection],
  Types: { ObjectId, Decimal128: Number, Mixed },
  Schema: { Types: SchemaTypes },
  Model: BaseModel,
  isValidObjectId,
  async connect() {
    return facade;
  },
  createConnection() {
    return connection;
  },
  async disconnect() {},
  startSession() {
    return makeSession();
  },
  set() {
    return facade;
  },
  get() {
    return undefined;
  },
  /** Access the underlying BaseModel instances (used by connectDb). */
  baseModels,
};

module.exports = facade;
