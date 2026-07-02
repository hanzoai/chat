import { v4 } from 'uuid';
import { useCallback } from 'react';
import { Constants } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import { useRunCloudAgentMutation } from '~/data-provider';
import { useChatContext } from '~/Providers';
import { useLocalize } from '~/hooks';

/**
 * Run a canonical Hanzo Cloud agent and render the exchange in the current
 * thread. This is the SINGLE run path shared by the `/agent` command and the
 * @mention picker — one action, two surfaces.
 *
 * It appends a user message and a pending assistant message to the thread, calls
 * the backend proxy (which forwards the user's hanzo.id token to cloud), then
 * replaces the pending message with the run output — or an honest error state
 * when the run fails or the user is not signed in via hanzo.id.
 */
export default function useRunCloudAgent() {
  const localize = useLocalize();
  const { conversation, getMessages, setMessages } = useChatContext();
  const runMutation = useRunCloudAgentMutation();

  return useCallback(
    async (name: string, prompt: string) => {
      const conversationId = conversation?.conversationId ?? Constants.NEW_CONVO;
      const existing = getMessages() ?? [];
      const parentMessageId = existing[existing.length - 1]?.messageId ?? Constants.NO_PARENT;

      const userMessageId = v4();
      const responseId = `${userMessageId}_`;
      const now = new Date().toLocaleString('sv').replace(' ', 'T');
      const input = (prompt ?? '').trim();

      const userMessage: TMessage = {
        messageId: userMessageId,
        conversationId,
        parentMessageId,
        sender: 'User',
        text: input ? `@${name} ${input}` : `@${name}`,
        isCreatedByUser: true,
        clientTimestamp: now,
        error: false,
      };

      const pending: TMessage = {
        messageId: responseId,
        conversationId,
        parentMessageId: userMessageId,
        sender: name,
        text: localize('com_agents_cloud_running', { 0: name }),
        isCreatedByUser: false,
        unfinished: true,
        error: false,
      };

      setMessages([...existing, userMessage, pending]);

      const finalize = (patch: Partial<TMessage>) => {
        const base = getMessages() ?? [...existing, userMessage, pending];
        setMessages(
          base.map((m) => (m.messageId === responseId ? { ...m, unfinished: false, ...patch } : m)),
        );
      };

      try {
        const run = await runMutation.mutateAsync({ name, input });
        if (run.status === 'ok') {
          finalize({ text: run.output ?? '' });
        } else {
          finalize({
            text: localize('com_agents_cloud_run_failed', {
              0: run.error || localize('com_ui_error'),
            }),
            error: true,
          });
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const message =
          status === 401
            ? localize('com_agents_cloud_signin_required')
            : localize('com_agents_cloud_run_failed', {
                0: (err as Error)?.message || localize('com_ui_error'),
              });
        finalize({ text: message, error: true });
      }
    },
    [conversation, getMessages, setMessages, runMutation, localize],
  );
}
