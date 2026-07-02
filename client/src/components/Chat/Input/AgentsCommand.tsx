import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { AutoSizer, List } from 'react-virtualized';
import { Spinner, useCombobox } from '@librechat/client';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import type { MentionOption } from '~/common';
import { useListCloudAgentsQuery } from '~/data-provider';
import { removeCharIfLast } from '~/utils';
import { useLocalize } from '~/hooks';
import MentionItem from './MentionItem';
import store from '~/store';

const commandChar = '/';
const ROW_HEIGHT = 44;

/**
 * `/agent` command popover — lists the caller's canonical Hanzo Cloud agents
 * (`/v1/agents`) as they type `/agent …`. Selecting one sets the composer to
 * `/agent <name> ` so the user can add a prompt; submitting runs the agent (the
 * run is intercepted in ChatForm and dispatched through the ONE run path,
 * useRunCloudAgent). Structurally mirrors PromptsCommand to stay DRY.
 */
function AgentsCommand({
  index,
  textAreaRef,
}: {
  index: number;
  textAreaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
}) {
  const localize = useLocalize();
  const setShowAgentsPopover = useSetRecoilState(store.showAgentsPopoverFamily(index));
  const showAgentsPopover = useRecoilValue(store.showAgentsPopoverFamily(index));

  const { data, isLoading } = useListCloudAgentsQuery({ enabled: showAgentsPopover });

  const options = useMemo<MentionOption[]>(
    () =>
      (data?.agents ?? []).map((agent) => ({
        type: 'cloudAgent',
        value: agent.name,
        label: agent.name,
        description: agent.description || agent.model,
      })),
    [data],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { open, setOpen, searchValue, setSearchValue, matches } = useCombobox({
    value: '',
    options,
  });

  const handleSelect = (mention?: MentionOption) => {
    if (!mention) {
      return;
    }
    setSearchValue('');
    setOpen(false);
    setShowAgentsPopover(false);

    const el = textAreaRef.current;
    if (el) {
      // Replace the in-progress command with `/agent <name> ` and keep focus so
      // the user can type a prompt, then Enter to run.
      removeCharIfLast(el, commandChar);
      el.value = `/agent ${mention.value} `;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  };

  useEffect(() => {
    if (!open) {
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const currentActiveItem = document.getElementById(`agent-item-${activeIndex}`);
    currentActiveItem?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  }, [activeIndex]);

  if (!showAgentsPopover) {
    return null;
  }

  const rowRenderer = ({
    index: rowIndex,
    key,
    style,
  }: {
    index: number;
    key: string;
    style: React.CSSProperties;
  }) => {
    const mention = matches[rowIndex] as MentionOption;
    return (
      <MentionItem
        index={rowIndex}
        type="agent"
        key={key}
        style={style}
        onClick={() => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = null;
          handleSelect(mention);
        }}
        name={mention.label ?? ''}
        icon={mention.icon}
        description={mention.description}
        isActive={rowIndex === activeIndex}
      />
    );
  };

  return (
    <div className="absolute bottom-28 z-10 w-full space-y-2">
      <div className="popover border-token-border-light rounded-2xl border bg-surface-tertiary-alt p-2 shadow-lg">
        <input
          // Focus transitions to the input field when the popover opens.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          ref={inputRef}
          placeholder={localize('com_agents_cloud_command_placeholder')}
          className="mb-1 w-full border-0 bg-surface-tertiary-alt p-2 text-sm focus:outline-none dark:text-gray-200"
          autoComplete="off"
          value={searchValue}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setShowAgentsPopover(false);
              textAreaRef.current?.focus();
            } else if (e.key === 'ArrowDown') {
              setActiveIndex((prev) => (prev + 1) % Math.max(matches.length, 1));
            } else if (e.key === 'ArrowUp') {
              setActiveIndex((prev) => (prev - 1 + matches.length) % Math.max(matches.length, 1));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              handleSelect(matches[activeIndex] as MentionOption | undefined);
            } else if (e.key === 'Backspace' && searchValue === '') {
              setOpen(false);
              setShowAgentsPopover(false);
              textAreaRef.current?.focus();
            }
          }}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            timeoutRef.current = setTimeout(() => {
              setOpen(false);
              setShowAgentsPopover(false);
            }, 150);
          }}
        />
        <div className="max-h-40 overflow-y-auto">
          {isLoading && open ? (
            <div className="flex h-32 items-center justify-center text-text-primary">
              <Spinner />
            </div>
          ) : null}
          {!isLoading && open ? (
            <div className="max-h-40">
              <AutoSizer disableHeight>
                {({ width }) => (
                  <List
                    width={width}
                    overscanRowCount={5}
                    rowHeight={ROW_HEIGHT}
                    rowCount={matches.length}
                    rowRenderer={rowRenderer}
                    scrollToIndex={activeIndex}
                    height={Math.min(matches.length * ROW_HEIGHT, 160)}
                  />
                )}
              </AutoSizer>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(AgentsCommand);
