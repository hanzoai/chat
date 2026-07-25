import { useRef, useState } from 'react';
import { ArrowUp, Check, ChevronDown, Square } from 'lucide-react';
import type { SearchMode } from '@hanzo/ai';
import type { TranslationKeys } from '~/hooks';
import { useGetModelsQuery } from '@hanzochat/data-provider/react-query';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * The answer-engine input: one field, mode-switched. `chat` hands the text to the
 * normal conversation flow; every other mode grounds it on the live web through
 * `/v1/chat/ask`. One input, one submit — the mode decides where it goes.
 *
 * Monochrome and mobile-first: the control row scrolls horizontally at 390px
 * rather than wrapping into a second bar, so the composer keeps one line.
 */

/** Answer modes, in the order they read as escalating effort. */
export const MODES = [
  { id: 'chat', key: 'com_answer_mode_chat' },
  { id: 'search', key: 'com_answer_mode_search' },
  { id: 'news', key: 'com_answer_mode_news' },
  { id: 'research', key: 'com_answer_mode_research' },
  { id: 'deep', key: 'com_answer_mode_deep' },
] as const satisfies readonly { id: SearchMode | 'chat'; key: TranslationKeys }[];

/** `@source` hints cloud honors. Chips, not free text — no unmatched hint. */
const SOURCES = ['news', 'academic', 'github', 'reddit', 'x'];

/** The endpoint whose catalog backs the picker (the house Zen family). */
const CATALOG_ENDPOINT = 'Hanzo';

export interface AnswerComposerProps {
  mode: SearchMode | 'chat';
  setMode: (m: SearchMode | 'chat') => void;
  model: string;
  setModel: (m: string) => void;
  sources: string[];
  toggleSource: (s: string) => void;
  isLoading: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
}

export default function AnswerComposer({
  mode,
  setMode,
  model,
  setModel,
  sources,
  toggleSource,
  isLoading,
  onSubmit,
  onStop,
}: AnswerComposerProps) {
  const localize = useLocalize();
  const [text, setText] = useState('');
  const [modelOpen, setModelOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const { data: modelsConfig } = useGetModelsQuery();
  const models = modelsConfig?.[CATALOG_ENDPOINT] ?? [];

  const submit = () => {
    const value = text.trim();
    if (!value || isLoading) {
      return;
    }
    onSubmit(value);
    setText('');
    if (areaRef.current) {
      areaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-3xl border border-border-medium bg-surface-primary shadow-sm transition-colors focus-within:border-text-secondary">
        <label htmlFor="answer-input" className="sr-only">
          {localize('com_answer_ask_placeholder')}
        </label>
        <textarea
          id="answer-input"
          ref={areaRef}
          rows={1}
          value={text}
          placeholder={localize(
            mode === 'chat' ? 'com_answer_chat_placeholder' : 'com_answer_ask_placeholder',
          )}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-[200px] w-full resize-none bg-transparent px-4 pt-3.5 text-base leading-6 text-text-primary outline-none placeholder:text-text-secondary"
        />

        <div className="flex items-center gap-1.5 overflow-x-auto px-2 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors',
                mode === m.id
                  ? 'bg-text-primary font-medium text-surface-primary'
                  : 'text-text-secondary hover:bg-surface-hover',
              )}
            >
              {localize(m.key)}
            </button>
          ))}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-1.5">
            {mode !== 'chat' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setSourcesOpen((v) => !v);
                    setModelOpen(false);
                  }}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
                >
                  {sources.length ? `@${sources.length}` : '@'}
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </button>
                {sourcesOpen && (
                  <Menu onClose={() => setSourcesOpen(false)}>
                    {SOURCES.map((s) => (
                      <MenuItem
                        key={s}
                        selected={sources.includes(s)}
                        onClick={() => toggleSource(s)}
                      >
                        @{s}
                      </MenuItem>
                    ))}
                  </Menu>
                )}
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setModelOpen((v) => !v);
                  setSourcesOpen(false);
                }}
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
              >
                {model}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
              {modelOpen && (
                <Menu onClose={() => setModelOpen(false)}>
                  {models.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-text-secondary">
                      {localize('com_answer_no_models')}
                    </div>
                  ) : (
                    models.map((m) => (
                      <MenuItem
                        key={m}
                        selected={m === model}
                        onClick={() => {
                          setModel(m);
                          setModelOpen(false);
                        }}
                      >
                        {m}
                      </MenuItem>
                    ))
                  )}
                </Menu>
              )}
            </div>

            <button
              type="button"
              aria-label={isLoading ? 'Stop' : 'Send'}
              onClick={isLoading ? onStop : submit}
              disabled={!isLoading && !text.trim()}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-text-primary text-surface-primary transition-opacity disabled:opacity-30"
            >
              {isLoading ? (
                <Square className="size-3.5 fill-current" aria-hidden="true" />
              ) : (
                <ArrowUp className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mode !== 'chat' && sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 px-1">
          {sources.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSource(s)}
              className="rounded-full border border-border-medium px-2.5 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-hover"
            >
              @{s} &times;
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A small anchored popover. Click-away closes it; no portal, no dependency. */
function Menu({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-10 cursor-default"
        onClick={onClose}
      />
      <div className="absolute bottom-full right-0 z-20 mb-2 max-h-64 min-w-[10rem] overflow-y-auto rounded-xl border border-border-medium bg-surface-primary py-1 shadow-lg">
        {children}
      </div>
    </>
  );
}

function MenuItem({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-surface-hover"
    >
      <span className="truncate">{children}</span>
      {selected && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
    </button>
  );
}
