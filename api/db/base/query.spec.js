'use strict';
const { matches, applyUpdate, parseProjection, applyProjection, sortDocs } = require('./query');

describe('base/query matcher', () => {
  const doc = {
    _id: 'a1',
    user: 'u1',
    conversationId: 'c1',
    tags: ['x', 'y'],
    tokenCount: 10,
    createdAt: '2026-07-04T00:00:00.000Z',
  };

  test('equality + implicit array-contains', () => {
    expect(matches(doc, { user: 'u1' })).toBe(true);
    expect(matches(doc, { user: 'u2' })).toBe(false);
    expect(matches(doc, { tags: 'x' })).toBe(true); // array contains
    expect(matches(doc, { tags: 'z' })).toBe(false);
  });

  test('operators $in/$nin/$ne/$exists', () => {
    expect(matches(doc, { conversationId: { $in: ['c1', 'c2'] } })).toBe(true);
    expect(matches(doc, { conversationId: { $nin: ['c2'] } })).toBe(true);
    expect(matches(doc, { user: { $ne: 'u2' } })).toBe(true);
    expect(matches(doc, { missing: { $exists: false } })).toBe(true);
    expect(matches(doc, { user: { $exists: true } })).toBe(true);
  });

  test('comparison operators with numbers and dates', () => {
    expect(matches(doc, { tokenCount: { $gt: 5, $lte: 10 } })).toBe(true);
    expect(matches(doc, { tokenCount: { $gte: 11 } })).toBe(false);
    expect(matches(doc, { createdAt: { $gt: new Date('2026-07-03T00:00:00Z') } })).toBe(true);
    expect(matches(doc, { createdAt: { $lt: new Date('2026-07-03T00:00:00Z') } })).toBe(false);
  });

  test('logical $or / $and / $nor', () => {
    expect(matches(doc, { $or: [{ user: 'nope' }, { conversationId: 'c1' }] })).toBe(true);
    expect(matches(doc, { $and: [{ user: 'u1' }, { conversationId: 'c1' }] })).toBe(true);
    expect(matches(doc, { $nor: [{ user: 'u1' }] })).toBe(false);
  });

  test('$exists false / null equivalence for absent fields', () => {
    expect(matches({ a: 1 }, { $or: [{ b: null }, { b: { $exists: false } }] })).toBe(true);
  });
});

describe('base/query applyUpdate', () => {
  test('$set / implicit set / $unset', () => {
    expect(applyUpdate({ a: 1 }, { $set: { b: 2 } })).toEqual({ a: 1, b: 2 });
    expect(applyUpdate({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 }); // implicit $set (merge)
    expect(applyUpdate({ a: 1, b: 2 }, { $unset: { b: 1 } })).toEqual({ a: 1 });
  });

  test('$inc accumulates', () => {
    expect(applyUpdate({ n: 5 }, { $inc: { n: 3 } })).toEqual({ n: 8 });
    expect(applyUpdate({}, { $inc: { n: 2 } })).toEqual({ n: 2 });
  });

  test('$push / $addToSet / $pull', () => {
    expect(applyUpdate({ a: [1] }, { $push: { a: 2 } })).toEqual({ a: [1, 2] });
    expect(applyUpdate({ a: [1] }, { $addToSet: { a: 1 } })).toEqual({ a: [1] });
    expect(applyUpdate({ a: [1, 2, 3] }, { $pull: { a: 2 } })).toEqual({ a: [1, 3] });
  });

  test('$setOnInsert only applies on insert', () => {
    expect(applyUpdate({}, { $setOnInsert: { a: 1 } }, { isInsert: true })).toEqual({ a: 1 });
    expect(applyUpdate({}, { $setOnInsert: { a: 1 } }, { isInsert: false })).toEqual({});
  });

  test('prototype pollution is blocked (dotted + bare keys, every operator)', () => {
    applyUpdate({}, { $set: { '__proto__.polluted': 'x' } });
    applyUpdate({}, { '__proto__.polluted2': 'y' }); // implicit $set
    applyUpdate({}, { $inc: { '__proto__.count': 5 } });
    applyUpdate({}, { $set: { 'constructor.prototype.polluted3': 'z' } });
    applyUpdate({}, { $set: { __proto__: { polluted4: 'w' } } });
    applyUpdate({}, { $rename: { a: '__proto__.x' } });
    expect({}.polluted).toBeUndefined();
    expect({}.polluted2).toBeUndefined();
    expect({}.count).toBeUndefined();
    expect({}.polluted3).toBeUndefined();
    expect({}.polluted4).toBeUndefined();
    expect({}.x).toBeUndefined();
    expect(Object.prototype.polluted).toBeUndefined();
  });
});

describe('base/query projection + sort', () => {
  const d = { _id: '1', a: 1, b: 2, c: 3, password: 'secret' };
  const hidden = new Set(['password']);
  test('inclusion projection keeps _id', () => {
    expect(applyProjection(d, parseProjection('a b'), hidden)).toEqual({ _id: '1', a: 1, b: 2 });
  });
  test('exclusion projection', () => {
    expect(applyProjection(d, parseProjection('-b -c -password'), hidden)).toEqual({ _id: '1', a: 1 });
  });
  test('select:false field hidden by default', () => {
    expect(applyProjection(d, null, hidden)).toEqual({ _id: '1', a: 1, b: 2, c: 3 });
  });
  test('+field re-includes a select:false field on top of default', () => {
    expect(applyProjection(d, parseProjection('+password'), hidden)).toEqual({
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      password: 'secret',
    });
  });
  test('explicit inclusion can return a select:false field', () => {
    expect(applyProjection(d, parseProjection('a password'), hidden)).toEqual({
      _id: '1',
      a: 1,
      password: 'secret',
    });
  });
  test('sort by multiple keys / directions', () => {
    const rows = [
      { k: 2, t: 'b' },
      { k: 1, t: 'a' },
      { k: 2, t: 'a' },
    ];
    expect(sortDocs(rows, { k: 1, t: 1 }).map((r) => `${r.k}${r.t}`)).toEqual(['1a', '2a', '2b']);
    expect(sortDocs(rows, { k: -1 }).map((r) => r.k)).toEqual([2, 2, 1]);
  });
});
