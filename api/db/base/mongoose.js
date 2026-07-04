'use strict';

/**
 * A drop-in `mongoose`-compatible facade backed by Hanzo Base.
 *
 * `@librechat/data-schemas` builds its schemas with the real `mongoose` as a
 * pure schema DSL and then asks a mongoose instance to turn those schemas into
 * models (`createModels`/`createMethods`). We hand it THIS facade instead: it
 * delegates schema/ObjectId/type concerns to the real mongoose (never
 * connecting it) but overrides model creation so every model is a BaseModel
 * persisting to Base — never MongoDB.
 *
 * Result: one adapter, and the entire data-schemas model+method surface
 * (User, Session, Token, Role, Balance, Conversation, Message, Agent, …) runs
 * on Base with zero per-model porting.
 */

const realMongoose = require('mongoose');
const { BaseModel, makeModelCtor } = require('./model');
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

const facade = new Proxy(realMongoose, {
  get(target, prop) {
    switch (prop) {
      case 'model':
        return model;
      case 'models':
        return models;
      case 'connection':
        return connection;
      case 'connections':
        return [connection];
      case 'connect':
        return async () => facade;
      case 'createConnection':
        return () => connection;
      case 'disconnect':
        return async () => {};
      case 'set':
        return () => facade;
      case 'Model':
        return BaseModel;
      case '__isBaseFacade':
        return true;
      default:
        return target[prop];
    }
  },
});

module.exports = facade;
