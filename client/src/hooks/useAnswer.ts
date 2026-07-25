import { useCallback, useRef, useState } from 'react';
import { apiBaseUrl } from '@hanzochat/data-provider';
import type { SearchSource, SearchMode } from '@hanzo/ai';
import { useAuthContext } from '~/hooks/AuthContext';
import useLocalize from '~/hooks/useLocalize';

/**
 * The answer engine, client side. Streams a grounded answer from chat's own
 * `/v1/chat/ask` relay, which attaches the tenant credential and pipes Hanzo
 * Cloud's `/v1/ask` envelope through unchanged.
 *
 * The frames ARE the `@hanzo/ai` SearchEvent union — `status | sources | text |
 * follow_ups | done` — so the source of truth for the shapes stays the published
 * SDK (imported here, not re-declared). This hook only owns the transport: ONE
 * request to ONE endpoint, because cloud does the search/rank/synthesize loop
 * server-side. It deliberately mirrors the shape of `@hanzo/chat`'s
 * `UseSearchResult` so a surface written against either reads the same.
 */
export interface UseAnswerResult {
  query: string;
  answer: string;
  sources: SearchSource[];
  followUps: string[];
  /** Human-readable stage: "searching" | "planning" | "reading" | "answering". */
  status: string;
  isLoading: boolean;
  error: string | null;
  /** True when the failure was "you need to sign in", so the UI can offer it. */
  needsSignIn: boolean;
  run: (query: string, opts?: { mode?: SearchMode; model?: string; sources?: string[] }) => void;
  stop: () => void;
  reset: () => void;
}

/** Anything the answer engine has produced this run. */
const EMPTY = {
  answer: '',
  sources: [] as SearchSource[],
  followUps: [] as string[],
  status: '',
  error: null as string | null,
  needsSignIn: false,
};

export default function useAnswer(): UseAnswerResult {
  const { token } = useAuthContext();
  const localize = useLocalize();
  const [query, setQuery] = useState('');
  const [state, setState] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setQuery('');
    setState(EMPTY);
  }, [stop]);

  const run = useCallback(
    (q: string, opts?: { mode?: SearchMode; model?: string; sources?: string[] }) => {
      const text = q.trim();
      if (!text) {
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setQuery(text);
      setState({ ...EMPTY, status: 'searching' });
      setIsLoading(true);

      void (async () => {
        try {
          const res = await fetch(`${apiBaseUrl()}/v1/chat/ask`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              q: text,
              mode: opts?.mode ?? 'search',
              ...(opts?.model ? { model: opts.model } : {}),
              ...(opts?.sources?.length ? { sources: opts.sources } : {}),
            }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            const body = await res.json().catch(() => ({}) as Record<string, unknown>);
            const message =
              typeof body?.error === 'string' ? body.error : localize('com_answer_unavailable');
            setState((s) => ({
              ...s,
              status: '',
              error: message,
              needsSignIn: res.status === 401,
            }));
            setIsLoading(false);
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // Data-only SSE: frames are `data: <json>\n\n`, terminated by `[DONE]`.
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split('\n\n');
            buffer = frames.pop() ?? '';
            for (const frame of frames) {
              for (const line of frame.split('\n')) {
                if (!line.startsWith('data: ')) {
                  continue;
                }
                const payload = line.slice(6);
                if (payload === '[DONE]') {
                  continue;
                }
                let ev: Record<string, unknown>;
                try {
                  ev = JSON.parse(payload);
                } catch {
                  continue;
                }
                switch (ev.type) {
                  case 'status':
                    setState((s) => ({ ...s, status: String(ev.stage ?? '') }));
                    break;
                  case 'sources':
                    setState((s) => ({ ...s, sources: (ev.sources as SearchSource[]) ?? [] }));
                    break;
                  case 'text':
                    setState((s) => ({ ...s, answer: s.answer + String(ev.delta ?? '') }));
                    break;
                  case 'follow_ups':
                    setState((s) => ({ ...s, followUps: (ev.questions as string[]) ?? [] }));
                    break;
                  case 'done':
                    setState((s) => ({
                      ...s,
                      status: '',
                      answer: (ev.answer as string) || s.answer,
                      sources: (ev.sources as SearchSource[]) ?? s.sources,
                    }));
                    break;
                  default:
                    break;
                }
              }
            }
          }
        } catch (err) {
          if ((err as Error)?.name !== 'AbortError') {
            setState((s) => ({
              ...s,
              status: '',
              error: localize('com_answer_interrupted'),
            }));
          }
        } finally {
          setIsLoading(false);
          abortRef.current = null;
        }
      })();
    },
    [token, localize],
  );

  return { query, ...state, isLoading, run, stop, reset };
}
