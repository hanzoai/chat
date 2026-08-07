const { StepTypes, GraphEvents } = require('@hanzochat/agents');
const { logger } = require('@hanzochat/data-schemas');
const { sendEvent, GenerationJobManager } = require('@hanzochat/api');

/**
 * Make a tool's run watchable.
 *
 * A code-execution call leases a sandbox and runs a command in it. The command
 * can take minutes — an install, a test suite, a build — and until now the
 * browser learned nothing until it was over: the tool call's `output` is set by
 * `on_run_step_completed` and by nothing before it. So the product's most
 * expensive act was also its most silent one.
 *
 * Two things have to happen before the command starts, and they are one act:
 *
 *   1. OPEN A SESSION. Cloud's agent registry is where a run's narration is
 *      kept — a durable ordered log, served live. A command names the session it
 *      narrates into and the sandbox appends its output there as the program
 *      produces it. No session, no narration; the session has to exist first.
 *   2. SAY WHERE IT IS. The browser has the tool call already (the step is
 *      dispatched from the model stream, before the tool is even entered) but it
 *      cannot guess the two ids. They ride an `on_run_step_delta` addressed at
 *      that exact step — the same channel, and the same shape, the OAuth prompt
 *      already uses to attach `auth` to a specific tool call mid-run.
 *
 * WHY THIS IS INJECTED. The tool lives in `packages/api`, which has no Express
 * and no business acquiring one; `res`, the resumable stream and the registry
 * all live here. So the server builds this and hands it in, exactly as it
 * already does for web search's `createOnSearchResults`. The tool calls one
 * function and knows nothing about how a browser is reached.
 *
 * BEST-EFFORT BY CONSTRUCTION. Watching is how a run is READ, never how it is
 * run. Every failure here answers an empty handle, the command runs unwatched,
 * and the result arrives exactly as it did before. A registry that is down must
 * never cost somebody their code.
 */

/** Cloud, resolved the one way the sandbox client resolves it. */
function cloudBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Register the run and answer its session id, or `''`.
 *
 * `host` is the sandbox, so the fleet views show a code-execution run as the
 * sandbox run it is rather than as an anonymous stream from a browser tab.
 */
async function open({ baseUrl, token, org, sandbox, title }) {
  try {
    const res = await fetch(`${cloudBaseUrl(baseUrl)}/agents/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(org ? { 'X-Org-Id': org } : {}),
      },
      body: JSON.stringify({
        agent: 'hanzo-chat',
        title: (title ?? '').slice(0, 120),
        status: 'running',
        host: sandbox,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      return '';
    }
    const body = await res.json();
    return typeof body?.id === 'string' ? body.id : '';
  } catch (err) {
    logger.debug('[watch] could not open a session; the run goes unwatched', err);
    return '';
  }
}

/**
 * Tell the browser where to watch, on the step it is already rendering.
 *
 * `args: ''` is deliberate and load-bearing: the client CONCATENATES a delta's
 * args onto what it has, so anything else here would corrupt the command the
 * model streamed. The OAuth emitter this copies does the same for the same
 * reason.
 */
function say({ res, streamId, stepId, toolCall, run }) {
  const data = {
    id: stepId,
    delta: {
      type: StepTypes.TOOL_CALLS,
      tool_calls: [{ ...toolCall, args: '' }],
      run,
    },
  };
  const event = { event: GraphEvents.ON_RUN_STEP_DELTA, data };
  if (streamId) {
    return GenerationJobManager.emitChunk(streamId, event);
  }
  if (res) {
    sendEvent(res, event);
  }
  return undefined;
}

/**
 * Build the "make this watchable" function a tool calls once, with the sandbox
 * it just leased. Answers the session to narrate into and the way to close it —
 * one handle, because opening a run and finishing it are the same concern and
 * splitting them across two injected functions is two things to forget.
 *
 * @param {object} deps
 * @param {import('http').ServerResponse} [deps.res]
 * @param {string|null} [deps.streamId]
 * @param {string} deps.baseUrl  cloud `/v1` base — the sandbox client's own
 * @param {string} deps.token    the caller's IAM bearer; there is no server key
 * @param {string} [deps.org]
 * @returns {(sandbox: string, toolCall: object|undefined, title?: string)
 *   => Promise<{ session: string, done: (status: string) => Promise<void> }>}
 */
function createWatch({ res, streamId = null, baseUrl, token, org }) {
  return async function watch(sandbox, toolCall, title) {
    const nothing = { session: '', done: async () => {} };
    if (!sandbox || !token) {
      return nothing;
    }
    const session = await open({ baseUrl, token, org, sandbox, title });
    if (!session) {
      return nothing;
    }
    // The ids reach the browser BEFORE the command starts, because a person
    // watching needs them while there is still something to watch.
    const { args: _args, stepId, ...rest } = toolCall ?? {};
    if (stepId) {
      try {
        await say({ res, streamId, stepId, toolCall: rest, run: { session, sandbox } });
      } catch (err) {
        // The log is still being written; only this browser missed the address.
        logger.debug('[watch] could not announce the run', err);
      }
    }
    return {
      session,
      done: (status) => close({ baseUrl, token, org, session, status }),
    };
  };
}

/**
 * Mark the run finished. The registry keeps a run's last word; a row left
 * `running` forever is a fleet view that lies.
 */
async function close({ baseUrl, token, org, session, status }) {
  if (!session) {
    return;
  }
  try {
    await fetch(`${cloudBaseUrl(baseUrl)}/agents/sessions/${encodeURIComponent(session)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(org ? { 'X-Org-Id': org } : {}),
      },
      body: JSON.stringify({ status }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    logger.debug('[watch] could not close the session', err);
  }
}

module.exports = { createWatch };
