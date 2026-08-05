import { useCallback, useEffect, useRef, useState } from 'react';
import { apiBaseUrl } from '@hanzochat/data-provider';
import type { SearchSource, SearchMode } from '@hanzo/ai';
import { useAuthContext } from '~/hooks/AuthContext';
import useLocalize from '~/hooks/useLocalize';

/**
 * The answer engine, client side. Streams a grounded answer from chat's own
 * `/v1/chat/ask` relay, which attaches the org credential and pipes Hanzo
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

  // An answer is a live, billed upstream call. Leaving the surface (switching to
  // chat mode starts a conversation, which unmounts this whole branch) must end
  // it — otherwise the relay and the cloud call keep running against a dead tree.
  useEffect(() => () => abortRef.current?.abort(), []);

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
            // A superseded run can land here: its abort surfaces as a rejected
            // json() that the catch above swallows. Only the current run writes.
            if (abortRef.current !== controller) {
              return;
            }
            const message =
              typeof body?.error === 'string' ? body.error : localize('com_answer_unavailable');
            setState((s) => ({
              ...s,
              status: '',
              error: message,
              // The relay says so explicitly; a bare 401 can also mean cloud
              // rejected a signed-in caller's token, which signing in again
              // would not fix.
              needsSignIn: body?.code === 'ASK_SIGNIN_REQUIRED',
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
                if (!line.startsWith('data:')) {
                  continue;
                }
                // SSE strips ONE optional leading space; `data:{...}` is as valid
                // as `data: {...}`, and an intermediary may re-serialize either way.
                const payload = line.slice(5).replace(/^ /, '');
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
          if ((err as Error)?.name !== 'AbortError' && abortRef.current === controller) {
            setState((s) => ({
              ...s,
              status: '',
              error: localize('com_answer_interrupted'),
            }));
          }
        } finally {
          // Only the CURRENT run may clear the shared state. A superseded run
          // settles after its replacement is already installed; without this it
          // would flip isLoading off and null the live controller, leaving a
          // stream that Stop can no longer reach.
          if (abortRef.current === controller) {
            setIsLoading(false);
            abortRef.current = null;
          }
        }
      })();
    },
    [token, localize],
  );

  return { query, ...state, isLoading, run, stop, reset };
}
