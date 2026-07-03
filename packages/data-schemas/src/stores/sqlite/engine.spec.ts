import {
  matchesFilter,
  applyUpdate,
  projectDoc,
  sortDocs,
  compareValues,
  equalitySeed,
  isOperatorUpdate,
  objectId,
} from './engine';

describe('sqlite engine — matchesFilter', () => {
  const doc = {
    _id: '1',
    user: 'u1',
    conversationId: 'c1',
    title: 'Hello',
    tags: ['a', 'b'],
    tokenCount: 5,
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expiredAt: null,
  };

  it('matches simple equality', () => {
    expect(matchesFilter(doc, { user: 'u1' })).toBe(true);
    expect(matchesFilter(doc, { user: 'u2' })).toBe(false);
  });

  it('matches multiple equality clauses (implicit AND)', () => {
    expect(matchesFilter(doc, { user: 'u1', conversationId: 'c1' })).toBe(true);
    expect(matchesFilter(doc, { user: 'u1', conversationId: 'cX' })).toBe(false);
  });

  it('{field:null} matches null OR missing', () => {
    expect(matchesFilter(doc, { expiredAt: null })).toBe(true);
    expect(matchesFilter(doc, { doesNotExist: null })).toBe(true);
    expect(matchesFilter(doc, { title: null })).toBe(false);
  });

  it('$in against scalar and array fields', () => {
    expect(matchesFilter(doc, { conversationId: { $in: ['c1', 'c2'] } })).toBe(true);
    expect(matchesFilter(doc, { conversationId: { $in: ['c9'] } })).toBe(false);
    expect(matchesFilter(doc, { tags: { $in: ['b', 'z'] } })).toBe(true);
    expect(matchesFilter(doc, { tags: { $in: ['z'] } })).toBe(false);
  });

  it('$ne matches non-equal AND missing fields (mongo semantics)', () => {
    expect(matchesFilter(doc, { isArchived: { $ne: false } })).toBe(false);
    expect(matchesFilter(doc, { isArchived: { $ne: true } })).toBe(true);
    expect(matchesFilter(doc, { missing: { $ne: 'x' } })).toBe(true);
  });

  it('$exists', () => {
    expect(matchesFilter(doc, { title: { $exists: true } })).toBe(true);
    expect(matchesFilter(doc, { missing: { $exists: false } })).toBe(true);
    expect(matchesFilter(doc, { expiredAt: { $exists: true } })).toBe(true); // null but present
  });

  it('$gt/$lt with dates', () => {
    expect(matchesFilter(doc, { createdAt: { $gt: new Date('2025-12-31') } })).toBe(true);
    expect(matchesFilter(doc, { createdAt: { $lt: new Date('2025-12-31') } })).toBe(false);
  });

  it('$or / $and composition', () => {
    expect(
      matchesFilter(doc, { $or: [{ user: 'nope' }, { conversationId: 'c1' }] }),
    ).toBe(true);
    expect(
      matchesFilter(doc, { $and: [{ user: 'u1' }, { $or: [{ isArchived: false }] }] }),
    ).toBe(true);
  });

  it('retention visibility filter shape', () => {
    const filter = {
      $or: [
        { isTemporary: false, expiredAt: null },
        { isTemporary: false, expiredAt: { $gt: new Date() } },
        { isTemporary: null, expiredAt: null },
      ],
    };
    expect(matchesFilter({ isTemporary: false, expiredAt: null }, filter)).toBe(true);
    expect(matchesFilter({ expiredAt: null }, filter)).toBe(true); // isTemporary missing == null
    expect(
      matchesFilter({ isTemporary: false, expiredAt: new Date(Date.now() - 1000) }, filter),
    ).toBe(false);
  });
});

describe('sqlite engine — applyUpdate', () => {
  it('implicit $set merges fields', () => {
    const out = applyUpdate({ a: 1, b: 2 }, { b: 3, c: 4 }, false);
    expect(out).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('$set / $unset / $inc', () => {
    const out = applyUpdate({ a: 1, b: 2, n: 5 }, { $set: { a: 9 }, $unset: { b: 1 }, $inc: { n: 3 } }, false);
    expect(out).toEqual({ a: 9, n: 8 });
  });

  it('$setOnInsert applies only on insert', () => {
    expect(applyUpdate({}, { $setOnInsert: { createdAt: 'x' } }, true)).toEqual({ createdAt: 'x' });
    expect(applyUpdate({}, { $setOnInsert: { createdAt: 'x' } }, false)).toEqual({});
  });

  it('mixed update folds top-level fields into $set (mongoose semantics)', () => {
    const inserted = applyUpdate(
      {},
      { tag: 't', user: 'u', count: 1, $setOnInsert: { createdAt: 'x' } },
      true,
    );
    expect(inserted).toEqual({ tag: 't', user: 'u', count: 1, createdAt: 'x' });
    const updated = applyUpdate({ tag: 't' }, { count: 2, $setOnInsert: { createdAt: 'x' } }, false);
    expect(updated).toEqual({ tag: 't', count: 2 }); // $setOnInsert skipped on update
  });

  it('$addToSet dedupes; $pull removes', () => {
    expect(applyUpdate({ t: ['a'] }, { $addToSet: { t: 'a' } }, false)).toEqual({ t: ['a'] });
    expect(applyUpdate({ t: ['a'] }, { $addToSet: { t: 'b' } }, false)).toEqual({ t: ['a', 'b'] });
    expect(applyUpdate({ t: ['a', 'b'] }, { $pull: { t: 'a' } }, false)).toEqual({ t: ['b'] });
  });

  it('does not mutate the base document', () => {
    const base = { a: 1 };
    applyUpdate(base, { $set: { a: 2 } }, false);
    expect(base).toEqual({ a: 1 });
  });
});

describe('sqlite engine — projection & sort', () => {
  const doc = { _id: '1', a: 1, b: 2, c: 3 };

  it('string inclusion keeps _id by default', () => {
    expect(projectDoc(doc, 'a b')).toEqual({ _id: '1', a: 1, b: 2 });
    expect(projectDoc(doc, '_id')).toEqual({ _id: '1' });
  });

  it('exclusion projection', () => {
    expect(projectDoc(doc, '-b')).toEqual({ _id: '1', a: 1, c: 3 });
  });

  it('multi-key date-aware sort', () => {
    const docs = [
      { t: 'b', d: new Date('2026-01-02') },
      { t: 'a', d: new Date('2026-01-03') },
      { t: 'a', d: new Date('2026-01-01') },
    ];
    const sorted = sortDocs([...docs], { t: 1, d: -1 });
    expect(sorted.map((x) => `${x.t}${x.d.getUTCDate()}`)).toEqual(['a3', 'a1', 'b2']);
  });

  it('compareValues handles null lowest', () => {
    expect(compareValues(null, 1)).toBe(-1);
    expect(compareValues(1, null)).toBe(1);
    expect(compareValues(null, null)).toBe(0);
  });
});

describe('sqlite engine — helpers', () => {
  it('equalitySeed extracts equality clauses only', () => {
    expect(equalitySeed({ user: 'u1', tags: { $in: ['a'] }, $or: [] })).toEqual({ user: 'u1' });
  });

  it('isOperatorUpdate', () => {
    expect(isOperatorUpdate({ $set: {} })).toBe(true);
    expect(isOperatorUpdate({ a: 1 })).toBe(false);
  });

  it('objectId is 24 hex chars and unique-ish', () => {
    const a = objectId();
    const b = objectId();
    expect(a).toMatch(/^[0-9a-f]{24}$/);
    expect(a).not.toBe(b);
  });
});
