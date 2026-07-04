'use strict';
/* buildFilter — the Base filter-DSL pushdown. Must only ever emit a SUPERSET. */
const { buildFilter } = require('./store');

const promoted = ['_id', 'conversationId', 'user', 'expiredAt', 'tokenCount'];

describe('store/buildFilter pushdown', () => {
  test('promoted equality + $in', () => {
    expect(buildFilter({ conversationId: 'c1', user: 'u1' }, promoted)).toBe(
      "conversationId = 'c1' && user = 'u1'",
    );
    expect(buildFilter({ conversationId: { $in: ['a', 'b'] } }, promoted)).toBe(
      "(conversationId = 'a' || conversationId = 'b')",
    );
  });

  test('DSL injection cannot break out of the quoted literal', () => {
    const f = buildFilter({ conversationId: "x' || user='victim" }, promoted);
    expect(f).toBe("conversationId = 'x\\' || user=\\'victim'");
    expect(f).not.toMatch(/ \|\| user='victim/); // no un-escaped injected clause
  });

  test('Date predicates are NOT pushed down (superset invariant — H1)', () => {
    // Base date columns normalize to a space separator; pushing an ISO literal
    // would wrongly EXCLUDE the record. Dates must fall through to the JS matcher.
    expect(buildFilter({ expiredAt: new Date('2026-07-04T12:00:00Z') }, promoted)).toBeUndefined();
    expect(buildFilter({ expiredAt: { $eq: new Date() } }, promoted)).toBeUndefined();
    // a date predicate must never partially push while dropping the date clause
    expect(buildFilter({ user: 'u1', expiredAt: new Date() }, promoted)).toBe("user = 'u1'");
  });

  test('non-finite numbers are not pushed (invalid DSL guard — L1)', () => {
    expect(buildFilter({ tokenCount: NaN }, promoted)).toBeUndefined();
    expect(buildFilter({ tokenCount: Infinity }, promoted)).toBeUndefined();
    expect(buildFilter({ tokenCount: 5 }, promoted)).toBe('tokenCount = 5');
  });

  test('non-promoted / $or / empty-$in are not pushed (JS matcher handles them)', () => {
    expect(buildFilter({ title: 'x' }, promoted)).toBeUndefined();
    expect(buildFilter({ $or: [{ user: 'a' }, { user: 'b' }] }, promoted)).toBeUndefined();
    expect(buildFilter({ conversationId: { $in: [] } }, promoted)).toBeUndefined();
  });
});
