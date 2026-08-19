import type * as t from './types';
import { EndpointURLs } from './config';
import * as s from './schemas';

export default function createPayload(submission: t.TSubmission) {
  const {
    isEdited,
    addedConvo,
    userMessage,
    isContinued,
    isTemporary,
    isRegenerate,
    conversation,
    editedContent,
    ephemeralAgent,
    endpointOption,
  } = submission;
  /**
   * The one field this needs, read rather than validated for.
   *
   * It used to be `tConvoUpdateSchema.parse(conversation)`, which validates a
   * whole conversation to destructure one string — and threw on every turn
   * after the first: that schema carries `messages: z.array(z.string())`, the
   * message IDS of a stored conversation, while an open thread holds them
   * populated as objects.
   *
   * The throw was silent and total. `startGeneration` calls this OUTSIDE its
   * try, so the rejection escaped unhandled: no request was ever sent, no
   * error path ran, `setIsSubmitting(false)` never fired, and the message was
   * never stored — the thinking indicator span forever over a send the server
   * never heard about, and the composer stayed disabled until a reload. A
   * validation whose only failure mode is an unreadable hang, on a value
   * nothing here validates, is worse than no validation: `conversationId` is
   * `z.string().nullable()` with no default and no transform, so parsing it
   * and reading it are the same value.
   */
  const conversationId = conversation?.conversationId ?? null;
  const { endpoint: _e, endpointType } = endpointOption as {
    endpoint: s.EModelEndpoint;
    endpointType?: s.EModelEndpoint;
  };

  const endpoint = _e as s.EModelEndpoint;
  let server = `${EndpointURLs[s.EModelEndpoint.agents]}/${endpoint}`;
  if (s.isAssistantsEndpoint(endpoint)) {
    server =
      EndpointURLs[(endpointType ?? endpoint) as 'assistants' | 'azureAssistants'] +
      (isEdited ? '/modify' : '');
  }

  const payload: t.TPayload = {
    ...userMessage,
    ...endpointOption,
    endpoint,
    addedConvo,
    isTemporary,
    isRegenerate,
    editedContent,
    conversationId,
    isContinued: !!(isEdited && isContinued),
    ephemeralAgent: s.isAssistantsEndpoint(endpoint) ? undefined : ephemeralAgent,
  };

  return { server, payload };
}
