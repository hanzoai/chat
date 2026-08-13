import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUp, Check, ChevronDown, Square } from 'lucide-react';
import * as Ariakit from '@ariakit/react/menu';
import { useGetModelsQuery } from '@hanzochat/data-provider/react-query';
import { DropdownPopup } from '@hanzochat/client';
import ComposerShell from '~/components/Chat/Input/ComposerShell';
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

/** The endpoint whose catalog backs the picker: Hanzo's gateway, Enso and Zen. */
const CATALOG_ENDPOINT = 'Hanzo';

/** One trigger shape for both pickers. */
const TRIGGER =
  'flex min-h-11 items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover';

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
  const sourcesMenuId = useId();
  const modelMenuId = useId();

  const { data: modelsConfig } = useGetModelsQuery();
  const models = useMemo(() => modelsConfig?.[CATALOG_ENDPOINT] ?? [], [modelsConfig]);

  const sourceItems = useMemo(
    () =>
      SOURCES.map((s) => ({
        id: s,
        label: `@${s}`,
        ariaChecked: sources.includes(s),
        icon: <Tick on={sources.includes(s)} />,
        hideOnClick: false,
        onClick: () => toggleSource(s),
      })),
    [sources, toggleSource],
  );

  const modelItems = useMemo(
    () =>
      models.length === 0
        ? [{ id: 'none', label: localize('com_answer_no_models'), disabled: true }]
        : models.map((m) => ({
            id: m,
            label: m,
            ariaChecked: m === model,
            icon: <Tick on={m === model} />,
            onClick: () => setModel(m),
          })),
    [models, model, setModel, localize],
  );

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
        The SAME shell the chat composer wears — see ComposerShell. This used to
        be its own box (a drop shadow, a hairline border, `surface-primary`), so
        picking Search or News swapped one composer for a differently-sized,
        differently-coloured one and the input jumped under the pointer.
      */}
      <ComposerShell className="pb-0">
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
          className="max-h-[200px] min-h-14 w-full resize-none bg-transparent px-4 pt-4 text-base leading-6 text-text-primary outline-none placeholder:text-text-secondary md:text-lg"
        />

        {/* The SAME skeleton as the chat composer's action row (its own
            `composer-actions` class): input tools on the LEFT, a spacer, the
            submit on the RIGHT. Switching a mode tab now keeps the frame and
            changes only the tools inside it — @sources/model here, attach/mic
            there — instead of swapping one widget for a differently-laid-out
            one. The submit stays the larger size-11 (owner call). */}
        <div className="composer-actions flex items-center gap-1.5 pb-2 pt-1">
          <div className="ml-2 flex items-center gap-1.5">
            <DropdownPopup
              portal={true}
              isOpen={sourcesOpen}
              setIsOpen={setSourcesOpen}
              menuId={sourcesMenuId}
              items={sourceItems}
              className="max-h-64 overflow-y-auto"
              trigger={
                <Ariakit.MenuButton
                  aria-label={localize('com_answer_sources')}
                  className={TRIGGER}
                  onClick={() => setModelOpen(false)}
                >
                  {sources.length ? `@${sources.length}` : '@'}
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </Ariakit.MenuButton>
              }
            />

            <DropdownPopup
              portal={true}
              isOpen={modelOpen}
              setIsOpen={setModelOpen}
              menuId={modelMenuId}
              items={modelItems}
              className="max-h-64 overflow-y-auto"
              trigger={
                <Ariakit.MenuButton
                  aria-label={localize('com_answer_model')}
                  className={TRIGGER}
                  onClick={() => setSourcesOpen(false)}
                >
                  {model}
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </Ariakit.MenuButton>
              }
            />
          </div>

          <div className="mx-auto flex" />

          <div className="mr-2">
            <button
              type="button"
              aria-label={localize(isLoading ? 'com_answer_stop' : 'com_answer_send')}
              onClick={isLoading ? onStop : submit}
              disabled={!isLoading && !text.trim()}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-surface-submit-hover bg-surface-submit text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isLoading ? (
                <Square className="size-3.5 fill-current" aria-hidden="true" />
              ) : (
                <ArrowUp className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </ComposerShell>

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

/** Selection mark that always occupies its slot, so labels stay on one axis. */
function Tick({ on }: { on: boolean }) {
  return <Check className={on ? 'size-3.5' : 'size-3.5 opacity-0'} aria-hidden="true" />;
}
