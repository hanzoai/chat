/**
 * `execute_code` — the model-facing code interpreter, over a Hanzo sandbox.
 *
 * The session IS the sandbox: `session_id` is the sandbox id, the artifact
 * directory is its workdir, and a "session that expired" is a lease the reaper
 * ended. There is no session table here and nothing to keep in sync, because
 * there is no second object to be out of sync with.
 *
 * ONE ROUND TRIP for a run. The program is delivered on the exec channel's stdin
 * rather than written first and run second — `sh -c` on the far side, a real
 * stream into it — so a call is a single hop through the apiserver instead of two.
 * The list of files the run created is written to a known path and read back only
 * when the model's own guidance says there might be one to read.
 */

import { tool, type DynamicStructuredTool } from '@langchain/core/tools';
import { logger } from '@hanzochat/data-schemas';
import { Sandbox, SandboxError, leaseExecSandbox, EXEC_ROOT } from './sandbox';

/**
 * What the sandbox image can actually run, verified against it rather than
 * inherited from a schema.
 *
 * Upstream advertised `d`, `f90` and `r`; the image carries no compiler for any
 * of them, so a model that picked one got a "command not found" it could not act
 * on. Advertising only what runs is the honest schema — and the model reads this
 * list as its menu, so a wrong entry is a wasted turn every time it is chosen.
 */
const RUNTIMES = {
  py: { ext: 'py', run: 'python3' },
  js: { ext: 'js', run: 'node' },
  ts: { ext: 'ts', run: 'bun run' },
  rb: { ext: 'rb', run: 'ruby' },
  php: { ext: 'php', run: 'php' },
  java: { ext: 'java', run: 'java' },
  go: { ext: 'go', run: 'go run' },
  bash: { ext: 'sh', run: 'bash' },
  /* Compiled: build beside the source, then run the binary. `&&` so a compile
   * error is the program's failure and its stderr is what the model sees. */
  c: { ext: 'c', build: 'gcc -O0 -o $B $S -lm', run: '$B' },
  cpp: { ext: 'cpp', build: 'g++ -O0 -std=c++20 -o $B $S', run: '$B' },
  rs: { ext: 'rs', build: 'rustc -O -o $B $S', run: '$B' },
} as const;

export type Language = keyof typeof RUNTIMES;
const LANGUAGES = Object.keys(RUNTIMES) as Language[];

/**
 * A run may hand back at most this many files. A loop that writes ten thousand
 * must cost one truncated list, not ten thousand downloads.
 */
const MAX_FILES = 40;

/** Make one argument literal for `sh -c`: close, escape, reopen. */
function q(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/**
 * Scratch lives in `/tmp`, NOT in the artifact directory.
 *
 * Two reasons, and the first is the one that bites. `/mnt/data` is the USER's
 * directory — it is where the model is told to leave its plots and CSVs, and it is
 * what the artifact scan reads — so putting this tool's own source file and
 * bookkeeping there means the scan has to recognise and skip its own droppings,
 * and one missed exclusion ships a `prog.py` to the user as a generated file. The
 * second is availability: `/tmp` is world-writable in the sandbox image and
 * `/mnt/data` currently is not (root:root 0755 against a pod that runs as uid
 * 1000), so scratch under the artifact directory could not even be created.
 *
 * Per call, not per session: two calls in one sandbox must not see each other's
 * source, and nothing here outlives the command that made it.
 */
function scratchDir(): string {
  return `/tmp/.hanzo-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * The shell the sandbox runs, and every line of it earns its place.
 *
 * `cat > src` takes the program from stdin, so the source never has to be quoted
 * into a command line and no amount of backticks or newlines in it can change what
 * runs. The program's cwd is the artifact directory, so `plot.png` means what the
 * model is told it means.
 *
 * # Why the output is framed rather than returned raw
 *
 * The program's stdout and stderr are REDIRECTED TO FILES, so the only thing on
 * this command's stdout is what these four `printf`s put there. That is the whole
 * point: three values have to come back through one channel — exit code, output,
 * and the list of files the run created — and a delimiter would let a program that
 * printed the delimiter forge the file list and name files it never wrote. With
 * the streams redirected there is nothing to interleave and nothing to forge.
 *
 * base64 rather than lengths: the payload is arbitrary bytes (a run can print
 * invalid UTF-8, and `find` output can contain anything a filename can), while the
 * transport is a JSON string. Encoding makes each part exactly one line, so the
 * reply is four lines read positionally, with no byte-offset arithmetic against a
 * value that has already been through a UTF-8 decoder.
 */
function script(lang: Language, args: string[], w: string): string {
  const rt = RUNTIMES[lang];
  const src = q(`${w}/prog.${rt.ext}`);
  const bin = q(`${w}/prog.bin`);
  const argv = args.length ? ` ${args.map(q).join(' ')}` : '';
  const build = 'build' in rt ? `${rt.build.replace('$B', bin).replace('$S', src)} && ` : '';
  const run = rt.run === '$B' ? bin : `${rt.run} ${src}`;
  const b = (f: string) => `base64 -w0 < ${q(`${w}/${f}`)}; echo`;
  return [
    `mkdir -p ${q(w)} || exit 70`,
    /* A toolchain that cannot write its cache fails before it compiles, and HOME
     * is the sandbox user's, not this call's. Point both at the scratch. */
    `export HOME=${q(w)} GOCACHE=${q(`${w}/gocache`)} GOPATH=${q(`${w}/go`)} TMPDIR=${q(w)}`,
    `cat > ${src}`,
    /* The program runs in the artifact directory: that is the path the model is
     * told to persist to, and it is cloud's own workdir for an exec sandbox. */
    `cd ${q(EXEC_ROOT)} 2>/dev/null || cd ${q(w)}`,
    `touch ${q(`${w}/.mark`)}`,
    `{ ${build}${run}${argv} ; } > ${q(`${w}/out`)} 2> ${q(`${w}/err`)}`,
    'rc=$?',
    `find . -maxdepth 1 -newer ${q(`${w}/.mark`)} -type f -printf '%P\\n' 2>/dev/null | head -n ${MAX_FILES} > ${q(`${w}/new`)} 2>/dev/null`,
    'echo "$rc"',
    b('out'),
    b('err'),
    b('new'),
    `rm -rf ${q(w)} 2>/dev/null`,
    'exit 0',
  ].join('\n');
}

/** Decode the four framed lines. Anything else means the shell itself failed —
 *  the sandbox refused, the image has no `base64`, output was truncated — and
 *  that is a broken sandbox, not a failed program. */
function unframe(stdout: string): { rc: number; out: string; err: string; files: string[] } | null {
  const lines = stdout.split('\n');
  if (lines.length < 4) {
    return null;
  }
  const rc = Number(lines[0].trim());
  if (!Number.isFinite(rc)) {
    return null;
  }
  const dec = (s: string) => Buffer.from(s.trim(), 'base64').toString('utf8');
  return {
    rc,
    out: dec(lines[1]),
    err: dec(lines[2]),
    files: dec(lines[3])
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  };
}

export const CODE_ARTIFACT_PATH_GUIDANCE = `Persist handoff artifacts in \`${EXEC_ROOT}\` with standard extensions (.json/.txt/.csv/.tsv/.log/.parquet/.png/.jpg/.pdf/.xlsx); files written to subdirectories or to \`/tmp\` are same-call scratch only, not later-call storage.`;

export const CodeExecutionToolName = 'execute_code';

export const CodeExecutionToolDescription = `
Runs code and returns stdout/stderr output from a sandboxed execution environment.

Usage:
- No network access available.
- Generated files are automatically delivered; **DO NOT** provide download links.
- ${CODE_ARTIFACT_PATH_GUIDANCE}
- NEVER use this tool to execute malicious code.
`.trim();

export const CodeExecutionToolSchema = {
  type: 'object',
  properties: {
    lang: {
      type: 'string',
      enum: LANGUAGES,
      description: 'The programming language or runtime to execute the code in.',
    },
    code: {
      type: 'string',
      description: `The complete, self-contained code to execute, without any truncation or minimization.
- Consecutive executions in one conversation share a runtime, so files written earlier are still there; variables and imports are NOT — each call is a fresh process.
- ${CODE_ARTIFACT_PATH_GUIDANCE}
- Input code **IS ALREADY** displayed to the user, so **DO NOT** repeat it in your response unless asked.
- Output code **IS NOT** displayed to the user, so **DO** write all desired output explicitly.
- IMPORTANT: You MUST explicitly print/output ALL results you want the user to see.
- py: This is not a notebook environment. Use \`print()\` for all outputs.
- py: Matplotlib: use a non-interactive backend and \`plt.savefig()\` to save plots as files.
- js: use the \`console\` or \`process\` methods for all outputs.
- Other languages: use appropriate output functions.`,
    },
    args: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Additional arguments to execute the code with. Only needed if the code reads argv.',
    },
  },
  required: ['lang', 'code'],
} as const;

export const CodeExecutionToolDefinition = {
  name: CodeExecutionToolName,
  description: CodeExecutionToolDescription,
  schema: CodeExecutionToolSchema,
} as const;

export const emptyOutputMessage = "stdout: Empty. Ensure you're writing output explicitly.\n";

/** A file this run produced, in the shape the artifact pipeline already speaks. */
export interface CodeEnvFile {
  id: string;
  name: string;
  session_id?: string;
}

export interface CodeExecutionArtifact {
  session_id: string;
  files?: CodeEnvFile[];
}

export interface CodeExecutionToolParams {
  /** The `/v1` base — `sandboxBaseUrl()`, the same origin the rest of the run uses. */
  baseUrl: string;
  /** The caller's verified IAM bearer. There is no shared server key here, and a
   *  missing bearer is a refusal rather than a fallback. */
  token: string;
  /** Files primed into the sandbox before the run, so the model is told what is
   *  already on disk. */
  files?: CodeEnvFile[];
  /** Bound the lease this tool takes. */
  ttlSec?: number;
}

/**
 * Turn the run's file list into artifact references.
 *
 * `-maxdepth 1` already guarantees a flat name; it is re-checked here because
 * this value becomes a URL segment and half of a `session/name` file identifier,
 * and a name that survives `find` is not automatically a name that survives that.
 */
function artifacts(sandboxId: string, names: string[]): CodeEnvFile[] {
  const seen = new Set<string>();
  const out: CodeEnvFile[] = [];
  for (const name of names) {
    if (!name || name.startsWith('.') || name.includes('/') || seen.has(name)) {
      continue;
    }
    seen.add(name);
    out.push({ id: name, name, session_id: sandboxId });
    if (out.length >= MAX_FILES) {
      break;
    }
  }
  return out;
}

function summarize(files: CodeEnvFile[]): string {
  if (!files.length) {
    return '';
  }
  return `\nGenerated files: ${files.map((f) => f.name).join(', ')}\n`;
}

/**
 * Build the tool.
 *
 * The lease is taken INSIDE the call, not at construction: a turn where the model
 * never runs code must not cost a pod, and an org is capped at 16 live exec
 * sandboxes. `session_id` arrives on `config.toolCall` (injected by the agents
 * ToolNode from the previous call's artifact) and is what makes the second call in
 * a conversation land in the same sandbox as the first.
 */
export function createCodeExecutionTool(params: CodeExecutionToolParams): DynamicStructuredTool {
  return tool(
    async (rawInput, config) => {
      const { lang, code, args } = rawInput as {
        lang: Language;
        code: string;
        args?: string[];
      };
      const { session_id } = (config?.toolCall ?? {}) as { session_id?: string };

      if (!RUNTIMES[lang]) {
        throw new Error(
          `Execution error:\n\nUnsupported language "${lang}". Supported: ${LANGUAGES.join(', ')}`,
        );
      }

      const w = scratchDir();
      try {
        const info = await leaseExecSandbox({
          baseUrl: params.baseUrl,
          token: params.token,
          id: session_id,
          ttlSec: params.ttlSec,
        });
        const sandbox = new Sandbox(params.baseUrl, info.id, params.token);

        const raw = await sandbox.exec(script(lang, args ?? [], w), {
          stdin: code,
          timeoutSec: 120,
        });
        const result = unframe(raw.stdout);
        if (!result) {
          throw new SandboxError(
            502,
            `sandbox ${info.id} returned no framed result` +
              (raw.stderr ? ` — ${raw.stderr.slice(0, 300)}` : ''),
          );
        }

        let output = '';
        if (result.out) {
          output += `stdout:\n${result.out}\n`;
        } else {
          output += emptyOutputMessage;
        }
        if (result.err) {
          output += `stderr:\n${result.err}\n`;
        }
        if (raw.timedOut) {
          output += 'Note: execution timed out and was terminated.\n';
        }

        const files = artifacts(info.id, result.files);
        logger.debug('[execute_code] ran', {
          sandbox: info.id,
          lang,
          exitCode: result.rc,
          files: files.length,
        });

        const artifact: CodeExecutionArtifact = files.length
          ? { session_id: info.id, files }
          : { session_id: info.id };

        return [output + summarize(files), artifact];
      } catch (error) {
        /* A refused or broken sandbox is reported as a failed tool call with the
         * status intact, because "you are not signed in" and "your code raised"
         * lead the model to different next moves. */
        const err = error as SandboxError | Error;
        const status = err instanceof SandboxError ? ` (HTTP ${err.status})` : '';
        throw new Error(`Execution error${status}:\n\n${err.message ?? String(error)}`);
      }
    },
    {
      name: CodeExecutionToolName,
      description: CodeExecutionToolDescription,
      schema: CodeExecutionToolSchema,
      responseFormat: 'content_and_artifact',
    },
  );
}
