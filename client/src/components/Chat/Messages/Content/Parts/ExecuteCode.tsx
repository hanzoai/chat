import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { Square } from 'lucide-react';
import { apiBaseUrl } from '@hanzochat/data-provider';
import { useToastContext } from '@hanzochat/client';
import type { TAttachment, Agents } from '@hanzochat/data-provider';
import ProgressText from '~/components/Chat/Messages/Content/ProgressText';
import MarkdownLite from '~/components/Chat/Messages/Content/MarkdownLite';
import { useAuthContext } from '~/hooks/AuthContext';
import useRunLog from '~/hooks/SSE/useRunLog';
import { useProgress, useLocalize } from '~/hooks';
import { AttachmentGroup } from './Attachment';
import Stdout from './Stdout';
import { cn } from '~/utils';
import store from '~/store';

/**
 * Stop what the sandbox is running.
 *
 * TWO VERBS EXIST AND THIS IS THE FIRST. Stopping ends the COMMAND; ending the
 * sandbox is a different act. Someone reaches for this because a build is wedged
 * or a test is hanging, and what they want next is to LOOK at it — the checkout,
 * the files it wrote, everything it has already said. So the box stays, and the
 * label says so: a control that might delete your work is one people hesitate
 * over instead of using.
 */
function StopRun({ sandbox }: { sandbox: string }) {
  const localize = useLocalize();
  const { token } = useAuthContext();
  const { showToast } = useToastContext();
  const [stopping, setStopping] = useState(false);

  const stop = async () => {
    setStopping(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/v1/chat/runs/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sandbox }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      // Zero stopped is not a failure: a command that ended a moment ago is one
      // there was nothing left to interrupt, and either way it is no longer
      // running — which is what was asked for.
      showToast({
        message: res.ok
          ? localize('com_ui_stop_run_done')
          : (body?.error ?? localize('com_ui_stop_run_failed')),
        status: res.ok ? 'success' : 'error',
      });
    } catch {
      showToast({ message: localize('com_ui_stop_run_failed'), status: 'error' });
    } finally {
      setStopping(false);
    }
  };

  return (
    <button
      type="button"
      onClick={stop}
      disabled={stopping}
      title={localize('com_ui_stop_run_hint')}
      aria-label={localize('com_ui_stop_run_hint')}
      className="flex shrink-0 items-center gap-1 rounded-md border border-border-light px-2 py-0.5 text-xs text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-50"
    >
      <Square className="size-3 fill-current" aria-hidden />
      {localize('com_ui_stop')}
    </button>
  );
}

interface ParsedArgs {
  lang?: string;
  code?: string;
}

export function useParseArgs(args?: string): ParsedArgs | null {
  return useMemo(() => {
    let parsedArgs: ParsedArgs | string | undefined | null = args;
    try {
      parsedArgs = JSON.parse(args || '');
    } catch {
      // console.error('Failed to parse args:', e);
    }
    if (typeof parsedArgs === 'object') {
      return parsedArgs;
    }
    const langMatch = args?.match(/"lang"\s*:\s*"(\w+)"/);
    const codeMatch = args?.match(/"code"\s*:\s*"(.+?)(?="\s*,\s*"(session_id|args)"|"\s*})/s);

    let code = '';
    if (codeMatch) {
      code = codeMatch[1];
      if (code.endsWith('"}')) {
        code = code.slice(0, -2);
      }
      code = code.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    return {
      lang: langMatch ? langMatch[1] : '',
      code,
    };
  }, [args]);
}

export default function ExecuteCode({
  isSubmitting,
  initialProgress = 0.1,
  args,
  output = '',
  attachments,
  run,
}: {
  initialProgress: number;
  isSubmitting: boolean;
  args?: string;
  output?: string;
  attachments?: TAttachment[];
  /** Where this call's work is running, while it is running. */
  run?: Agents.ToolRun;
}) {
  const localize = useLocalize();
  const hasOutput = output.length > 0;

  /**
   * Over when the SERVER says so, not when the animation finishes.
   *
   * `progress` below is a simulated ramp for the spinner; `initialProgress`
   * reaching 1 and `output` arriving are the two things the run step actually
   * reports. The live tail closes on those, so the finished output replaces the
   * narration rather than appearing under a second copy of it.
   */
  const done = hasOutput || initialProgress >= 1;
  const live = useRunLog(run?.session, !done);
  // Output chunks are raw bytes and already carry their own newlines, so they
  // concatenate; a phase (`leased`, `exit`) is a line of its own.
  const narration = useMemo(
    () => live.map((l) => (l.step ? `\n${l.message || l.step}\n` : l.message)).join(''),
    [live],
  );
  const showing = hasOutput ? output : narration;
  const outputRef = useRef<string>(showing);
  const codeContentRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const showAnalysisCode = useAtomValue(store.showCode);
  const [showCode, setShowCode] = useState(showAnalysisCode);
  const [contentHeight, setContentHeight] = useState<number | undefined>(0);

  const prevShowCodeRef = useRef<boolean>(showCode);
  const { lang = 'py', code } = useParseArgs(args) ?? ({} as ParsedArgs);
  const progress = useProgress(initialProgress);

  useEffect(() => {
    if (showing !== outputRef.current) {
      outputRef.current = showing;

      if (showCode && codeContentRef.current) {
        setTimeout(() => {
          if (codeContentRef.current) {
            const newHeight = codeContentRef.current.scrollHeight;
            setContentHeight(newHeight);
          }
        }, 10);
      }
    }
  }, [showing, showCode]);

  useEffect(() => {
    if (showCode !== prevShowCodeRef.current) {
      prevShowCodeRef.current = showCode;

      if (showCode && codeContentRef.current) {
        setIsAnimating(true);
        requestAnimationFrame(() => {
          if (codeContentRef.current) {
            const height = codeContentRef.current.scrollHeight;
            setContentHeight(height);
          }

          const timer = setTimeout(() => {
            setIsAnimating(false);
          }, 500);

          return () => clearTimeout(timer);
        });
      } else if (!showCode) {
        setIsAnimating(true);
        setContentHeight(0);

        const timer = setTimeout(() => {
          setIsAnimating(false);
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [showCode]);

  useEffect(() => {
    if (!codeContentRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (showCode && !isAnimating) {
        for (const entry of entries) {
          if (entry.target === codeContentRef.current) {
            setContentHeight(entry.contentRect.height);
          }
        }
      }
    });

    resizeObserver.observe(codeContentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [showCode, isAnimating]);

  const cancelled = !isSubmitting && progress < 1;

  return (
    <>
      {/* `w-full`, not `size-5`, so Stop can sit at the far right. ProgressText's
          own content is absolutely positioned and takes no layout width, so a
          sibling placed straight after it would be painted underneath the label —
          the 20px box below is the space the label is allowed to overflow out of,
          and it is preserved exactly. */}
      <div className="relative my-2.5 flex w-full items-center gap-2.5">
        <div className="relative flex size-5 shrink-0 items-center gap-2.5">
          <ProgressText
            progress={progress}
            onClick={() => setShowCode((prev) => !prev)}
            inProgressText={localize('com_ui_analyzing')}
            finishedText={
              cancelled ? localize('com_ui_cancelled') : localize('com_ui_analyzing_finished')
            }
            hasInput={!!code?.length}
            isExpanded={showCode}
            error={cancelled}
          />
        </div>
        {/* Only while there is a command to interrupt. A Stop that sometimes
            does nothing is worse than one that appears when it can act. */}
        {!done && run?.sandbox && (
          <div className="ml-auto">
            <StopRun sandbox={run.sandbox} />
          </div>
        )}
      </div>
      <div
        className="relative mb-2"
        style={{
          height: showCode ? contentHeight : 0,
          overflow: 'hidden',
          transition:
            'height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: showCode ? 1 : 0,
          transformOrigin: 'top',
          willChange: 'height, opacity',
          perspective: '1000px',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'subpixel-antialiased',
        }}
      >
        <div
          className={cn(
            'code-analyze-block mt-0.5 overflow-hidden rounded-xl bg-surface-primary',
            showCode && 'shadow-lg',
          )}
          ref={codeContentRef}
          style={{
            transform: showCode ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
            opacity: showCode ? 1 : 0,
            transition:
              'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {showCode && (
            <div
              style={{
                transform: showCode ? 'translateY(0)' : 'translateY(-4px)',
                opacity: showCode ? 1 : 0,
                transition:
                  'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <MarkdownLite
                content={code ? `\`\`\`${lang}\n${code}\n\`\`\`` : ''}
                codeExecution={false}
              />
            </div>
          )}
          {/* One area, one source. While the command runs this is the live
              narration; the moment its real output lands, that replaces it —
              never both, so the same bytes are never printed twice. */}
          {showing.length > 0 && (
            <div
              className={cn(
                'bg-surface-tertiary p-4 text-xs',
                showCode ? 'border-t border-surface-primary-contrast' : '',
              )}
              style={{
                transform: showCode ? 'translateY(0)' : 'translateY(-6px)',
                opacity: showCode ? 1 : 0,
                transition:
                  'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.05s, opacity 0.45s cubic-bezier(0.19, 1, 0.22, 1) 0.05s',
                boxShadow: showCode ? '0 -1px 0 rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <div className="prose flex flex-col-reverse">
                <Stdout output={showing} />
              </div>
            </div>
          )}
        </div>
      </div>
      {attachments && attachments.length > 0 && <AttachmentGroup attachments={attachments} />}
    </>
  );
}
