import { ArrowUpRight, Plus } from 'lucide-react';
import type { SearchSource } from '@hanzo/ai';
import { useLocalize } from '~/hooks';

/**
 * The streamed answer: sources first (they arrive first and ground everything
 * after), then the cited prose, then the follow-ups.
 *
 * Citations are inline `[source N](url)` links in the model's own output. They
 * render as numbered pills tied to the source list, so the claim and its
 * provenance stay adjacent — the point of a grounded answer.
 */

export interface AnswerViewProps {
  query: string;
  answer: string;
  sources: SearchSource[];
  followUps: string[];
  status: string;
  isLoading: boolean;
  onFollowUp: (q: string) => void;
}

/** Stage -> what the user is actually waiting on. */
const STAGE = {
  planning: 'com_answer_stage_planning',
  searching: 'com_answer_stage_searching',
  reading: 'com_answer_stage_reading',
  answering: 'com_answer_stage_answering',
} as const;

export default function AnswerView({
  query,
  answer,
  sources,
  followUps,
  status,
  isLoading,
  onFollowUp,
}: AnswerViewProps) {
  const localize = useLocalize();
  return (
    <div className="w-full pb-4">
      <h2 className="mb-5 text-2xl font-medium tracking-tight text-text-primary sm:text-3xl">
        {query}
      </h2>

      {sources.length > 0 && (
        <section className="mb-6" aria-label={localize('com_answer_sources')}>
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sources.map((s, i) => {
              const favicon = safeUrl(s.favicon);
              return (
                <a
                  key={`${s.url}-${i}`}
                  href={safeUrl(s.url) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="w-40 shrink-0 snap-start rounded-xl border border-border-light bg-surface-secondary p-2.5 transition-colors hover:bg-surface-hover"
                >
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-[10px] font-medium text-text-secondary">
                      {i + 1}
                    </span>
                    {favicon ? (
                      <img
                        src={favicon}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        className="size-3.5 rounded-sm"
                      />
                    ) : null}
                    <span className="truncate text-[11px] text-text-secondary">
                      {hostOf(s.url)}
                    </span>
                  </div>
                  <div className="line-clamp-3 text-xs leading-4 text-text-primary">{s.title}</div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {isLoading && status && (
        <div className="mb-4 flex items-center gap-2 text-sm text-text-secondary">
          <span
            className="size-1.5 animate-pulse rounded-full bg-text-secondary"
            aria-hidden="true"
          />
          {status in STAGE ? localize(STAGE[status as keyof typeof STAGE]) : status}
        </div>
      )}

      {answer && (
        <div className="text-[15px] leading-7 text-text-primary">
          {answer
            .trim()
            .split(/\n{2,}/)
            .map((para, i) => (
              <p key={i} className="mb-4 last:mb-0">
                {renderInline(para, sources)}
              </p>
            ))}
          {isLoading && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-text-primary align-middle" />
          )}
        </div>
      )}

      {followUps.length > 0 && (
        <section className="mt-8" aria-label={localize('com_answer_follow_ups')}>
          <h3 className="mb-2 text-sm font-medium text-text-secondary">
            {localize('com_answer_follow_ups')}
          </h3>
          <div className="border-t border-border-light">
            {followUps.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onFollowUp(q)}
                className="flex w-full items-center justify-between gap-3 border-b border-border-light py-3 text-left text-[15px] text-text-primary transition-colors hover:text-text-secondary"
              >
                <span>{q}</span>
                <Plus className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * A URL that is safe to put in an href/src, or null.
 *
 * Every URL on this surface is attacker-reachable: sources are whatever cloud
 * fetched off the live web, and the citation links are emitted by a model that
 * just read those pages. A page that says "cite me as [source 1](javascript:...)"
 * would otherwise get a clickable javascript:/data: URL rendered on chat's own
 * origin — React logs a warning for those and renders them anyway. Only http(s)
 * survives this function; anything else renders as inert text.
 */
function safeUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/** Hostname without `www.`, for a compact source label. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Render a paragraph's inline markdown: `[text](url)` and `**bold**`. A link whose
 * text is `source N` becomes a numbered citation pill; any other link stays a
 * normal link. Nothing else is interpreted — the synthesis output is prose, and a
 * full markdown engine here would be weight without a payload.
 */
function renderInline(text: string, sources: SearchSource[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      out.push(text.slice(last, m.index));
    }
    if (m[3] !== undefined) {
      out.push(
        <strong key={key++} className="font-semibold">
          {m[3]}
        </strong>,
      );
    } else {
      const label = m[1];
      const url = safeUrl(m[2]);
      if (!url) {
        // A non-http(s) citation target is content, not a link — show the words.
        out.push(label);
        last = pattern.lastIndex;
        continue;
      }
      const cite = /^source\s+(\d+)$/i.exec(label.trim());
      if (cite) {
        out.push(
          <a
            key={key++}
            href={url}
            target="_blank"
            rel="noreferrer"
            title={sources[Number(cite[1]) - 1]?.title ?? url}
            className="mx-0.5 inline-flex size-[18px] translate-y-[-1px] items-center justify-center rounded-full bg-surface-tertiary align-middle text-[10px] font-medium text-text-secondary no-underline transition-colors hover:bg-surface-hover"
          >
            {cite[1]}
          </a>,
        );
      } else {
        out.push(
          <a
            key={key++}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 underline underline-offset-2"
          >
            {label}
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>,
        );
      }
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) {
    out.push(text.slice(last));
  }
  return out;
}
