const fs = require('fs');
const path = require('path');

/**
 * MCP tool authorization does not exist in this fork. This fails the build if
 * anyone enables MCP without it.
 *
 * `filterAuthorizedTools` — upstream's control that strips MCP tools a user is
 * not entitled to before an agent is created, updated, duplicated or reverted —
 * is imported by `filterAuthorizedTools.spec.js` from `./v1`, and `./v1` does
 * not export it. It exists nowhere in this repository. An upstream sync brought
 * the TESTS and not the CODE, the same half-merge that left `requireJwtAuth`
 * with thirteen tests for a middleware it does not have.
 *
 * Right now that is harmless, and only because of a fact nobody wrote down: the
 * production config declares no `mcpServers:` at all (checked in the running
 * pod — no such block, no mention of mcp). With no servers there are no MCP
 * tools to attach and nothing to be unauthorized for. The gap is LATENT.
 *
 * The danger is the next person. They enable MCP, they see a 39-test file
 * called `filterAuthorizedTools.spec.js` describing exactly this control —
 * "should strip unauthorized MCP tools on create", "should store
 * mcpServerNames only for authorized servers" — and they reasonably conclude it
 * is enforced. It is not. Those tests have never run: eighteen die on
 * `filterAuthorizedTools is not a function`, and the eleven that DO run prove
 * the handlers keep the unauthorized tools and persist them, `mcpServerNames`
 * and all.
 *
 * So this asserts the PRECONDITION rather than the control: MCP may be
 * configured only once something enforces authorization on it. It is
 * deliberately a guard and not an implementation — porting upstream's filter is
 * real work with semantics to get right, and a wrong filter is worse than a
 * missing one because it looks like a control.
 *
 * To satisfy this test, do ONE of:
 *   - implement + export `filterAuthorizedTools` from `./v1` (then
 *     `filterAuthorizedTools.spec.js` becomes the real guard and this can go), or
 *   - leave `mcpServers` out of the config.
 */
describe('MCP cannot be enabled without tool authorization', () => {
  /** `./v1` is the agents controller the spec imports the filter from. */
  const filterExists = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return typeof require('./v1').filterAuthorizedTools === 'function';
    } catch {
      return false;
    }
  };

  /** Every config this repo ships that a deployment might actually load. */
  const configs = ['chat.yaml', 'hanzo-chat.example.yaml']
    .map((name) => path.join(__dirname, '..', '..', '..', '..', name))
    .filter((file) => fs.existsSync(file));

  const declaresMcpServers = (file) =>
    // A top-level `mcpServers:` key — not a mention in a comment.
    /^mcpServers:/m.test(fs.readFileSync(file, 'utf8'));

  it('finds at least one config to check — otherwise this guard is vacuous', () => {
    expect(configs.length).toBeGreaterThan(0);
  });

  it.each(configs)('%s does not enable MCP while the filter is absent', (file) => {
    if (filterExists()) {
      return; // the control is here; filterAuthorizedTools.spec.js is the guard now
    }
    expect(declaresMcpServers(file)).toBe(false);
  });

  it('states the precondition it is protecting, so a failure explains itself', () => {
    // If this ever fails it means the filter appeared, which is good news:
    // delete this file and let filterAuthorizedTools.spec.js do the work.
    expect(filterExists()).toBe(false);
  });
});
