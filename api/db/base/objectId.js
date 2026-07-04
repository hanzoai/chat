'use strict';

/**
 * Mongo-compatible ObjectId generation.
 *
 * Hanzo Base stores documents keyed by its own 15-char id, but LibreChat code
 * treats `_id` as a 24-hex Mongo ObjectId string (equality, `.toString()`,
 * refs). We generate real ObjectId-shaped values so that behaviour is
 * preserved without a live MongoDB.
 *
 * Layout (12 bytes -> 24 hex): 4-byte timestamp | 5-byte process random | 3-byte counter.
 */

const crypto = require('crypto');

const PROCESS_RANDOM = crypto.randomBytes(5);
let COUNTER = crypto.randomBytes(3).readUIntBE(0, 3);

/** @returns {string} 24-char lowercase hex ObjectId string. */
function generateObjectId() {
  const buf = Buffer.allocUnsafe(12);
  buf.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
  PROCESS_RANDOM.copy(buf, 4);
  COUNTER = (COUNTER + 1) % 0xffffff;
  buf.writeUIntBE(COUNTER, 9, 3);
  return buf.toString('hex');
}

const HEX_24 = /^[0-9a-fA-F]{24}$/;

/** @param {unknown} value @returns {boolean} */
function isValidObjectId(value) {
  if (value == null) {
    return false;
  }
  if (typeof value === 'string') {
    return HEX_24.test(value);
  }
  if (typeof value === 'object' && typeof value.toString === 'function') {
    return HEX_24.test(value.toString());
  }
  return false;
}

/**
 * A minimal, dependency-free ObjectId compatible with the surface the chat code
 * uses from `mongoose.Types.ObjectId`: `new ObjectId()`, `new ObjectId(hex)`,
 * `.isValid()`, `.createFromHexString()`, and instances that stringify / JSON /
 * compare as their 24-hex value. Lets us drop the `mongoose` runtime dependency.
 */
class ObjectId {
  constructor(id) {
    if (id == null) {
      this._id = generateObjectId();
    } else if (typeof id === 'string') {
      this._id = id;
    } else if (id instanceof ObjectId) {
      this._id = id._id;
    } else if (typeof id.toHexString === 'function') {
      this._id = id.toHexString();
    } else {
      this._id = String(id);
    }
  }

  toString() {
    return this._id;
  }
  toHexString() {
    return this._id;
  }
  toJSON() {
    return this._id;
  }
  valueOf() {
    return this._id;
  }
  equals(other) {
    if (other == null) {
      return false;
    }
    return String(typeof other.toHexString === 'function' ? other.toHexString() : other) === this._id;
  }

  static isValid(value) {
    return isValidObjectId(value);
  }
  static createFromHexString(hex) {
    return new ObjectId(hex);
  }
}

module.exports = { generateObjectId, isValidObjectId, HEX_24, ObjectId };
