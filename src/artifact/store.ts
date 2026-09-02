/**
 * The code block under inspection, and how it gets run.
 *
 * Running is `POST /v1/sandbox/write` followed by `POST /v1/sandbox/run` on the
 * lease `~/terminal/sandbox` holds — the same borrowed computer the terminal
 * shows, so a file written from here is a file the terminal can list. What
 * reaches the log is the program's own output, including its own failure to
 * start; nothing narrates a build on its behalf.
 *
 * An artifact opens EMPTY. There is no code here until a fenced block or the
 * palette puts some here.
 */
import { sandbox } from '~/terminal/sandbox'

import { useEffect, useState } from 'react'

export type ArtifactTab = 'code' | 'preview' | 'turn' | 'logs'

export type LayoutMode = 'default' | 'split' | 'studio' | 'focus'

/**
 * The last turn, as the composer reports it.
 *
 * The two summaries and the model are what was actually sent and what actually
 * came back. The counts and the two latencies are the caller's estimates —
 * `src/shell/Chat.tsx` derives tokens from string length and passes constants
 * for the timings — so they are held but not shown. `/v1/chat/completions`
 * answers a `usage` object and that is where real counts come from; `/v1/usage`
 * accounts for the org, never for one turn.
 */
export type Turn = {
  inputSummary?: string
  outputSummary?: string
  model?: string
  timestamp?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  latencyMs?: number
  ttftMs?: number
}

export type ArtifactData = {
  id: string
  title: string
  language: string
  code: string
  activeTab: ArtifactTab
  isOpen: boolean
  isIntelligenceOpen: boolean
  layoutMode: LayoutMode
  turn: Turn
}

/**
 * How a language is run, when it can be. A language absent here has no
 * interpreter to name, so the Run control is not drawn for it — and what is
 * named is a REQUEST of the sandbox, not a promise: an image without `python3`
 * answers so itself.
 */
const RUNNERS: Record<string, { ext: string; argv: (path: string) => string[] }> = {
  python: { ext: 'py', argv: (path) => ['python3', path] },
  py: { ext: 'py', argv: (path) => ['python3', path] },
  javascript: { ext: 'mjs', argv: (path) => ['node', path] },
  js: { ext: 'mjs', argv: (path) => ['node', path] },
  typescript: { ext: 'ts', argv: (path) => ['node', '--experimental-strip-types', path] },
  ts: { ext: 'ts', argv: (path) => ['node', '--experimental-strip-types', path] },
  bash: { ext: 'sh', argv: (path) => ['sh', path] },
  sh: { ext: 'sh', argv: (path) => ['sh', path] },
  shell: { ext: 'sh', argv: (path) => ['sh', path] },
}

export const runner = (language: string) => RUNNERS[language.toLowerCase()] ?? null

/** A page the browser can render on its own, with no server and no pretending. */
export const previewable = (language: string) => language === 'html' || language === 'svg'

const name = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const EMPTY: ArtifactData = {
  id: '',
  title: '',
  language: 'text',
  code: '',
  activeTab: 'code',
  isOpen: false,
  isIntelligenceOpen: false,
  layoutMode: 'default',
  turn: {},
}

let current: ArtifactData = EMPTY

const listeners = new Set<(next: ArtifactData) => void>()

const patch = (next: Partial<ArtifactData>) => {
  current = { ...current, ...next }
  for (const fn of listeners) fn(current)
}

export const artifactStore = {
  get: (): ArtifactData => current,

  open: (data?: Partial<ArtifactData>) => {
    patch({
      ...data,
      id: data?.id || current.id || `art_${Date.now()}`,
      isOpen: true,
    })
  },

  close: () => patch({ isOpen: false }),
  toggle: () => patch({ isOpen: !current.isOpen }),

  closeIntelligence: () => patch({ isIntelligenceOpen: false }),
  toggleIntelligence: () => patch({ isIntelligenceOpen: !current.isIntelligenceOpen }),

  setLayoutMode: (layoutMode: LayoutMode) =>
    patch({
      layoutMode,
      isOpen: layoutMode === 'split' || layoutMode === 'studio',
      isIntelligenceOpen: layoutMode === 'studio',
    }),

  updateCode: (code: string) => patch({ code }),

  setTab: (activeTab: ArtifactTab) => patch({ activeTab, isOpen: true }),

  updateTelemetry: (turn: Turn) => patch({ turn: { ...current.turn, ...turn } }),

  /** Puts the code on the sandbox and runs it. The Logs tab is where it lands. */
  run: async () => {
    const how = runner(current.language)
    if (!how || !current.code.trim()) return
    const path = `${name(current.title) || 'artifact'}.${how.ext}`
    patch({ activeTab: 'logs', isOpen: true })
    if (!(await sandbox.write(path, current.code))) return
    await sandbox.run(how.argv(path))
  },

  /** Interrupts what the sandbox is running. The lease survives. */
  stop: () => sandbox.interrupt(),
}

export const useArtifact = (): ArtifactData => {
  const [artifact, setArtifact] = useState<ArtifactData>(current)
  useEffect(() => {
    const handler = (next: ArtifactData) => setArtifact(next)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])
  return artifact
}
