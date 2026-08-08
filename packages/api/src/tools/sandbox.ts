/**
 * The code interpreter, as a sandbox with a session lease.
 *
 * A code-execution call and an agentic run are the SAME object with different
 * lifetimes: a sandbox. So there is one client for both, and this is chat's copy
 * of the one hanzo.app already proved (`lib/agent/sandbox.ts`) — same three verbs,
 * same error discipline, same reason for each.
 *
 *     chat server  ──Bearer(user)──▶  cloud /v1/sandboxes/{run,:id/fs}
 *                                     └──▶  kube exec into the pod (gVisor, uid 1000)
 *
 * THREE VERBS and no more. `POST /run` runs a command; `GET /:id/fs?path=` reads
 * a file or lists a directory; `POST /:id/fs?path=` writes one, the file as the
 * raw body. A recursive listing is `find` and a grep is `grep` — a second
 * endpoint for either would be a second way to ask a question the sandbox already
 * answers.
 *
 * Running is the one verb addressed at the COLLECTION rather than at a sandbox,
 * so its id travels in the body. That is not an inconsistency to tidy away: it is
 * the only op that takes a SESSION to narrate into, and narration is the whole
 * difference between watching a command work and staring at a spinner.
 *
 * # The credential is the USER's, and that is the whole point
 *
 * There is no service key here and there must never be one. The bearer is the
 * signed-in user's Hanzo IAM token, resolved by the one resolver chat already has
 * (`resolveTenantBearer`); cloud validates it, pins the org from the verified
 * `owner` claim, and the sandbox pod is labelled with that org. A shared service
 * key carries no tenant, which is not merely a policy violation — it is why the
 * old `/v1/exec` surface COULD NOT BILL. With the user's bearer the run lands on
 * the account that ran it, because the account is the only thing the call carries.
 *
 * # What was here before
 *
 * `@hanzochat/agents`' CodeExecutor POSTing `{BASEURL}/exec` behind an `X-API-Key`
 * read from `EnvVar.CODE_API_KEY` — an enum member that DOES NOT EXIST in the
 * shipped package, so the header was `undefined` at every call site and setting
 * the env var was a no-op. It pointed at cloud's `/v1/exec`, which proxied to a
 * `code-exec` Service whose endpoints have been `<none>` since it was created.
 * Three layers of nothing, each looking configured.
 */

import { logger } from '@hanzochat/data-schemas';
import { resolveTenantBearer, type TenantBearerRequest } from '../endpoints/custom/tenantBearer';

/** How long an exec sandbox this process opens is allowed to live. Cloud's own
 *  default for the class is 900s and its reaper enforces it; sending it keeps the
 *  lease a stated fact rather than an inherited one. */
export const DEFAULT_TTL_SEC = 900;

/** Per-request ceiling. A wedged sandbox must not hang the model's turn. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** The interpreter's artifact directory, and cloud's workdir for class `exec`.
 *  Every path below is relative to it. */
export const EXEC_ROOT = '/mnt/data';

/** Where this client keeps the source it runs and the bookkeeping that finds new
 *  files. Under the workdir because `confine` admits nothing above it, dot-prefixed
 *  and excluded from the artifact scan so it never shows up as a user's output. */
const WORK = '.hanzo';

/**
 * The sandbox did not answer the question.
 *
 * "The file is not there" and "I could not find out" are different facts and the
 * only safe place to collapse them is nowhere. Exactly one status is data — 404,
 * which the sandbox emits only for a genuinely missing path — and every other
 * non-2xx raises, so no method below can turn a broken sandbox into an empty
 * listing or a missing file.
 */
export class SandboxError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SandboxError';
  }
}

/** A sandbox as the API reports it — the row, not the handle. */
export interface SandboxInfo {
  id: string;
  org?: string;
  class?: 'exec' | 'dev' | 'desktop';
  status?: 'pending' | 'running' | 'suspended' | 'error';
  image?: string;
  pod?: string;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
  durationMs?: number;
}

/**
 * The Hanzo Cloud origin, resolved the ONE way chat already resolves it: the
 * dedicated variable, else the host the rest of chat is already talking to with
 * its `/v1` stripped. Exported so nothing has to spell the rule a second time.
 */
export function cloudOrigin(): string {
  const explicit = (process.env.HANZO_CLOUD_URL || '').trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }
  const base = (process.env.OPENAI_BASE_URL || '').trim();
  return base ? base.replace(/\/v1\/?$/, '').replace(/\/+$/, '') : '';
}

/** The `/v1` base every sandbox call hangs off, or '' when no cloud is configured. */
export function sandboxBaseUrl(): string {
  const origin = cloudOrigin();
  return origin ? `${origin}/v1` : '';
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'User-Agent': 'HanzoChat/1.0' };
}

/**
 * Get the caller's exec sandbox, resuming `id` when it is still running.
 *
 * Resume is a GET and not a create-with-id, because the create route binds no id
 * — asking `GET /:id` whether the session is still alive is the same question and
 * it is the one the wire actually answers. A named-but-gone session leases a fresh
 * sandbox: the model is continuing a conversation whose 15-minute lease expired
 * while the user was reading, and the honest answer to that is a working sandbox
 * with a new id, which every reply already carries back.
 *
 * Threading the id matters more than it looks. Cloud caps an org at 16 live exec
 * sandboxes and each is a real pod; a tool that sent no session id took a fresh
 * pod for every call and a forty-call loop took forty pods.
 */
export async function leaseExecSandbox(opts: {
  baseUrl: string;
  token: string;
  id?: string;
  ttlSec?: number;
  timeoutMs?: number;
}): Promise<SandboxInfo> {
  const base = opts.baseUrl.replace(/\/+$/, '');
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const headers = authHeaders(opts.token);

  if (opts.id) {
    try {
      const res = await fetch(`${base}/sandboxes/${encodeURIComponent(opts.id)}`, {
        headers,
        signal: AbortSignal.timeout(timeout),
      });
      if (res.ok) {
        const m = (await res.json()) as SandboxInfo;
        if (m?.id && m.status === 'running') {
          return m;
        }
      } else {
        await res.body?.cancel().catch(() => {});
      }
    } catch (err) {
      logger.debug('[sandbox] resume failed, leasing fresh', { id: opts.id, err });
    }
  }

  const res = await fetch(`${base}/sandboxes`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ class: 'exec', ttlSec: opts.ttlSec ?? DEFAULT_TTL_SEC }),
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new SandboxError(res.status, `lease sandbox: ${res.status} ${body.slice(0, 400)}`);
  }
  const m = (await res.json()) as SandboxInfo;
  if (!m?.id) {
    throw new SandboxError(502, 'lease sandbox: reply carried no id');
  }
  return m;
}

/** A leased sandbox, addressed. */
export class Sandbox {
  /** `…/sandboxes` — the collection. `mine` addresses this one within it. */
  private readonly base: string;
  private readonly mine: string;
  private readonly timeoutMs: number;

  constructor(
    baseUrl: string,
    readonly id: string,
    private readonly token: string,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.base = `${baseUrl.replace(/\/+$/, '')}/sandboxes`;
    this.mine = `/${encodeURIComponent(id)}`;
    this.timeoutMs = timeoutMs;
  }

  /**
   * One request, and the one place a failure is named as a failure. `allow` is
   * the caller's declaration that a particular non-2xx carries meaning for it —
   * only reads use it, only for 404.
   */
  private async call(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    init: {
      query?: Record<string, string>;
      body?: unknown;
      /** The file itself. `body` is a JSON envelope; a file is bytes. */
      raw?: string | Buffer;
      timeoutMs?: number;
      allow?: number[];
    } = {},
  ): Promise<Response> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(init.query ?? {})) {
      url.searchParams.set(k, v);
    }
    const headers: Record<string, string> = authHeaders(this.token);
    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (init.raw !== undefined) {
      headers['Content-Type'] = 'application/octet-stream';
    }
    const res = await fetch(url, {
      method,
      headers,
      body:
        init.raw !== undefined
          ? (init.raw as BodyInit)
          : init.body === undefined
            ? undefined
            : JSON.stringify(init.body),
      signal: AbortSignal.timeout(init.timeoutMs ?? this.timeoutMs),
    });
    if (res.ok || (init.allow ?? []).includes(res.status)) {
      return res;
    }
    const detail = await res.text().catch(() => '');
    throw new SandboxError(
      res.status,
      `${method} ${path}: sandbox ${this.id} returned ${res.status}${
        detail ? ` — ${detail.slice(0, 300)}` : ''
      }`,
    );
  }

  /**
   * Run a command in the sandbox. `command` reaches the pod as `sh -c`, and
   * `stdin` is a real stream into it — which is what lets a program be delivered
   * and run in ONE round trip instead of a write followed by an exec.
   *
   * A non-zero `exitCode` is a SUCCESSFUL call carrying a failed program. That
   * distinction is cloud's and it is kept here, so the model can tell "your code
   * raised" from "the sandbox is broken" and debug the right one.
   */
  async exec(
    command: string,
    opts: { stdin?: string; timeoutSec?: number; session?: string } = {},
  ): Promise<ExecResult> {
    const timeoutSec = opts.timeoutSec ?? 120;
    // `run`, not `:id/exec`. They run the same command through the same code
    // path and exactly one of them carries a SESSION: `/:id/exec` has no field
    // for one, so a command sent there is silent for its whole life however many
    // people are watching. Named, the sandbox appends the command's output to
    // that session's live log as the program produces it. `run` is also the op
    // the fleet publishes to agents (`run_in_sandbox`), so a person driving a
    // sandbox from chat and an agent driving one for a build share ONE address.
    const res = await this.call('POST', '/run', {
      body: {
        id: this.id,
        command,
        stdin: opts.stdin ?? '',
        timeoutSec,
        ...(opts.session ? { session: opts.session } : {}),
      },
      timeoutMs: (timeoutSec + 15) * 1000,
    });
    const out = (await res.json()) as Partial<ExecResult>;
    return {
      exitCode: out.exitCode ?? 0,
      stdout: out.stdout ?? '',
      stderr: out.stderr ?? '',
      timedOut: out.timedOut ?? false,
      durationMs: out.durationMs,
    };
  }

  /** `null` means the sandbox answered 404 — the path is not there. It never
   *  means the sandbox failed to answer; that throws. */
  async read(path: string): Promise<string | null> {
    const res = await this.call('GET', `${this.mine}/fs`, { query: { path }, allow: [404] });
    if (res.status === 404) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    return res.text();
  }

  /** The raw bytes, for a file that is not text — a plot, a parquet, a PDF. */
  async readBuffer(path: string): Promise<Buffer | null> {
    const res = await this.call('GET', `${this.mine}/fs`, { query: { path }, allow: [404] });
    if (res.status === 404) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async write(path: string, content: string | Buffer): Promise<void> {
    await this.call('POST', `${this.mine}/fs`, { query: { path }, raw: content });
  }
}

/**
 * The credential a sandbox call runs under is not configured; it is WHO IS ASKING.
 *
 * This is the one place a request becomes a sandbox, and it is deliberately a
 * refusal rather than a fallback: with no forwardable IAM bearer there is no org,
 * with no org there is no tenant to bill, and a shared key that papered over that
 * is exactly what made the old surface unbillable. `resolveTenantBearer` is chat's
 * ONE bearer resolver — the same function the chat-completion and cloud-agent
 * paths use — so a token that is expired, unbound, or belongs to another principal
 * never reaches here.
 */
export class NoTenantError extends Error {
  constructor() {
    super(
      'Code execution requires a signed-in Hanzo account: sign in with hanzo.id so the sandbox runs under your organization.',
    );
    this.name = 'NoTenantError';
  }
}

export function tenantBearerOrThrow(req: TenantBearerRequest): string {
  const token = resolveTenantBearer(req);
  if (!token) {
    throw new NoTenantError();
  }
  return token;
}

/**
 * A `Sandbox` handle for this request, leasing one when `id` names nothing live.
 *
 * Every server-side caller that touches the code environment — the run, the file
 * upload, the artifact download — comes through here, so "which sandbox, on whose
 * behalf" is answered once.
 */
export async function sandboxForRequest(
  req: TenantBearerRequest,
  id?: string,
): Promise<Sandbox> {
  const baseUrl = sandboxBaseUrl();
  if (!baseUrl) {
    throw new SandboxError(503, 'no cloud origin configured (HANZO_CLOUD_URL / OPENAI_BASE_URL)');
  }
  const token = tenantBearerOrThrow(req);
  const info = await leaseExecSandbox({ baseUrl, token, id });
  return new Sandbox(baseUrl, info.id, token);
}

/** Is this sandbox still leased and running? The upload path asks before it
 *  decides whether a file recorded against an old session still exists. */
export async function sandboxIsLive(req: TenantBearerRequest, id: string): Promise<boolean> {
  const baseUrl = sandboxBaseUrl();
  if (!baseUrl || !SANDBOX_ID_RE.test(id)) {
    return false;
  }
  const token = resolveTenantBearer(req);
  if (!token) {
    return false;
  }
  try {
    const res = await fetch(`${baseUrl}/sandboxes/${encodeURIComponent(id)}`, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      return false;
    }
    const m = (await res.json()) as SandboxInfo;
    return m?.status === 'running';
  } catch {
    return false;
  }
}

/** Cloud's sandbox id: `m_` + 12 random bytes, hex. Validated wherever an id
 *  arrives from a URL, because it is about to become one. */
export const SANDBOX_ID_RE = /^m_[0-9a-f]{24}$/;

/** An artifact name as it can appear in a URL segment and in a `session/name`
 *  file identifier: one flat path component, no dots-only, no separators. */
export const ARTIFACT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}$/;
