import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Check, ChevronDown, Square } from 'lucide-react';
import { useGetModelsQuery } from '@hanzochat/data-provider/react-query';
import { useLocalize } from '~/hooks';

/**
 * The grounded-search input. Rendered for the web modes only — chat mode uses the
 * real chat composer, so nothing here reimplements attachments, slash commands or
 * query-param prefill.
 *
 * Monochrome and mobile-first: the control row stays on one line at 390px.
 */

/** `@source` hints cloud honors. Chips, not free text — no unmatched hint. */
const SOURCES = ['news', 'academic', 'github', 'reddit', 'x'];

/** The endpoint whose catalog backs the picker (the house Zen family). */
const CATALOG_ENDPOINT = 'Hanzo';

export interface AnswerComposerProps {
  model: string;
  setModel: (m: string) => void;
  sources: string[];
  toggleSource: (s: string) => void;
  isLoading: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
}

export default function AnswerComposer({
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
  const models = useMemo(() => modelsConfig?.[CATALOG_ENDPOINT] ?? [], [modelsConfig]);

  // The catalog is the authority on what this caller may run — a guest is scoped
  // to one model server-side. Selecting the first real model (rather than a
  // hardcoded default) keeps the picker honest for both guests and members.
  useEffect(() => {
    if (models.length && !models.includes(model)) {
      setModel(models[0]);
    }
  }, [models, model, setModel]);

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
      {/*
        Focus reads as a LIFT, not a second box. `focus-within:border-text-secondary`
        flipped this 1px border to a near-white TEXT token, which painted a hard
        bright rectangle whose square corners fought the 24px radius — it looked
        like a second border stacked inside the rounded one. ChatForm already had
        the right language for this (steady border, `shadow-md` -> `shadow-lg` on
        focus), so use that: one focus treatment across both composers.
      */}
      <div className="rounded-3xl border border-border-medium bg-surface-primary shadow-md transition-shadow duration-200 focus-within:shadow-lg">
        <label htmlFor="answer-input" className="sr-only">
          {localize('com_answer_ask_placeholder')}
        </label>
        <textarea
          id="answer-input"
          ref={areaRef}
          rows={1}
          value={text}
          placeholder={localize('com_answer_ask_placeholder')}
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

        <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
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
              aria-label={localize(isLoading ? 'com_answer_stop' : 'com_answer_send')}
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

      {sources.length > 0 && (
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
  const localize = useLocalize();
  return (
    <>
      <button
        type="button"
        aria-label={localize('com_answer_close_menu')}
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
