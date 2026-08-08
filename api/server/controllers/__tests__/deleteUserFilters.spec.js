const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { createModels } = require('@hanzochat/data-schemas');

/**
 * Every filter in the account-deletion chain must name a field its schema
 * actually declares.
 *
 * `AgentApiKey.deleteMany({ user: user._id })` sat in this chain filtering on a
 * field the schema does not have — the owner is `userId`, and there is no
 * `user` on it at all. A Mongo-shaped filter naming an undeclared field matches
 * zero rows and throws nothing, so the call was indistinguishable from one that
 * had nothing to delete. Nine correct statements around it made it invisible:
 * the account disappears, so it LOOKS erased, while the API key rows — hashed
 * key material included — stay in the store.
 *
 * Nothing catches that class by reading the code. A type checker does not see
 * inside a filter object, and no test asserts a row count, so this is the check
 * that has to exist somewhere.
 *
 * Two decisions make it hold up rather than rot:
 *
 * - The schemas are the REAL ones, from `createModels`. `schema.path(field)` is
 *   authoritative, where a regex over a schema file is not: a quick pattern
 *   anchored on `field: {` reports `Group.memberIds` missing, because an array
 *   field is written `memberIds: [`, and it looks for `memoryentry.ts` when the
 *   file is `memory.ts`. Both of those were false positives during the audit
 *   that found the real bug.
 * - The call list is DERIVED from the source, not enumerated here. An
 *   enumerated list is a deny-list — it covers the calls somebody thought of,
 *   and the next deletion added to the chain is exactly the one it misses.
 *
 * Deriving it costs a coverage floor: if the parse ever stops matching, an
 * empty list would satisfy every assertion and this file would pass while
 * checking nothing. So it asserts the count first.
 */
describe('deleteUserController — every filter names a real schema field', () => {
  const models = createModels(mongoose);

  /**
   * The body of `deleteUserController`, where the deletion chain lives.
   *
   * A plain `throw`, not an `expect` — this runs while the file is being read,
   * and an assertion that fires there takes the whole suite down as
   * `Tests: 0 total`, which reads like a file nobody wrote rather than a
   * failure. The message says what to do instead.
   */
  const chain = () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'UserController.js'), 'utf8');
    const start = src.search(/^const deleteUserController = /m);
    if (start === -1) {
      throw new Error(
        'deleteUserController not found in UserController.js — this guard reads that ' +
          'function to find the deletion chain. If it was renamed, rename it here too.',
      );
    }
    const end = src.indexOf('\n};', start);
    return src.slice(start, end === -1 ? undefined : end);
  };

  /**
   * `await Model.deleteMany({ field: …` / `.updateMany({ field: …`
   *
   * The `(?:\/\/[^\n]*\n\s*)*` is not decoration. Without it this pattern
   * finds eight of the nine calls and silently drops `Group.updateMany`, whose
   * filter sits on the line after a comment — the guard would have carried the
   * same blind spot it exists to prevent, and the floor below would have been
   * written to match the undercount.
   */
  const filters = () =>
    [
      ...chain().matchAll(
        /await (\w+)\.(deleteMany|updateMany)\(\s*(?:\/\/[^\n]*\n\s*)*\{\s*(\w+):/g,
      ),
    ].map(([, model, op, field]) => ({ model, op, field }));

  it('every filter in the chain names a field its schema declares', () => {
    const found = filters();

    /**
     * The floor comes FIRST. Without it a parse that stops matching yields an
     * empty list, every loop below runs zero times, and this file passes while
     * checking nothing — the precise failure it exists to prevent. Nine raw
     * filters are in the chain today; a tenth should not fail this, losing one
     * should be deliberate.
     */
    expect(found.length).toBeGreaterThanOrEqual(9);

    const wrong = found.filter(
      ({ model, field }) => !models[model] || !models[model].schema.path(field),
    );
    expect(
      wrong.map(({ model, op, field }) => `${model}.${op}({ ${field} }) — not on the schema`),
    ).toEqual([]);
  });

  it('would have caught the AgentApiKey bug', () => {
    // The exact shape that shipped: the owner is `userId`, and asking the
    // schema for `user` is how you find that out.
    expect(models.AgentApiKey.schema.path('userId')).toBeDefined();
    expect(models.AgentApiKey.schema.path('user')).toBeUndefined();
  });
});
