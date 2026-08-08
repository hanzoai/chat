import React, { useMemo, useCallback, useEffect } from 'react';
import debounce from 'lodash/debounce';
import { Tools } from '@hanzochat/data-provider';
import { TerminalSquareIcon } from 'lucide-react';
import { Spinner, TooltipAnchor, useToastContext } from '@hanzochat/client';
import type { CodeBarProps } from '~/common';
import { useToolCallMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { useMessageContext } from '~/Providers';
import { cn, normalizeLanguage } from '~/utils';

const RunCode: React.FC<CodeBarProps & { iconOnly?: boolean }> = React.memo(
  ({ lang, codeRef, blockIndex, iconOnly = false }) => {
    const localize = useLocalize();
    const { showToast } = useToastContext();
    const execute = useToolCallMutation(Tools.execute_code, {
      onError: () => {
        showToast({ message: localize('com_ui_run_code_error'), status: 'error' });
      },
    });

    const { messageId, conversationId, partIndex } = useMessageContext();
    const normalizedLang = useMemo(() => normalizeLanguage(lang), [lang]);
    /* No key dialog and no client-side auth gate. The sandbox runs under the
     * signed-in user's own IAM bearer, so there is nothing to collect here: a
     * caller with no session gets the server's honest refusal, which is a fact the
     * user can act on, rather than a form asking for a key that does not exist. */
    const handleExecute = useCallback(async () => {
      const codeString: string = codeRef.current?.textContent ?? '';
      if (
        typeof codeString !== 'string' ||
        codeString.length === 0 ||
        typeof normalizedLang !== 'string' ||
        normalizedLang.length === 0
      ) {
        return;
      }

      execute.mutate({
        partIndex,
        messageId,
        blockIndex,
        conversationId: conversationId ?? '',
        lang: normalizedLang,
        code: codeString,
      });
    }, [codeRef, execute, partIndex, messageId, blockIndex, conversationId, normalizedLang]);

    const debouncedExecute = useMemo(
      () => debounce(handleExecute, 1000, { leading: true }),
      [handleExecute],
    );

    useEffect(() => {
      return () => {
        debouncedExecute.cancel();
      };
    }, [debouncedExecute]);

    if (typeof normalizedLang !== 'string' || normalizedLang.length === 0) {
      return null;
    }

    const buttonContent = (
      <>
        {execute.isLoading ? (
          <Spinner className="animate-spin" size={18} />
        ) : (
          <TerminalSquareIcon size={18} aria-hidden="true" />
        )}
        {!iconOnly && localize('com_ui_run_code')}
      </>
    );

    const button = (
      <button
        type="button"
        className={cn(
          'flex items-center justify-center rounded-sm hover:bg-gray-700 focus:bg-gray-700 focus:outline focus:outline-white',
          iconOnly ? 'p-1.5' : 'ml-auto gap-2 px-2 py-1',
        )}
        onClick={debouncedExecute}
        disabled={execute.isLoading}
        aria-label={localize('com_ui_run_code')}
      >
        {buttonContent}
      </button>
    );

    return iconOnly ? (
      <TooltipAnchor description={localize('com_ui_run_code')} render={button} />
    ) : (
      button
    );
  },
);

export default RunCode;
