import createPayload from './createPayload';
import { tPresetSchema } from './schemas';
import type * as t from './types';

/**
 * The second turn of a conversation used to be unsendable.
 *
 * `tConversationSchema.messages` is `z.array(z.string())` — the message IDS a
 * STORED conversation carries — but the conversation the client holds while a
 * thread is open has them POPULATED as objects. So every schema derived from it
 * threw `Expected string, received object` from turn two onward, and the two
 * places that parsed a live conversation both did it where a throw could not be
 * seen:
 *
 *   - `createPayload` is called by `startGeneration` OUTSIDE its try, so the
 *     rejection escaped unhandled — no request sent, no error path, the message
 *     never stored, and `setIsSubmitting(false)` never reached. The thinking
 *     indicator span forever over a send the server never heard about.
 *   - the five `tPresetSchema.parse(submission.conversation)` calls are all in
 *     error handlers that clear the spinner AFTER the parse, so an error (a
 *     gateway 402, say) hung exactly the same way instead of being rendered.
 *
 * Both were one silent hang with a locked composer, recoverable only by reload.
 * These tests use a conversation shaped the way a live one actually is.
 */
const liveConversation = {
  conversationId: 'abc-123',
  endpoint: 'agents',
  title: 'New Chat',
  messages: [
    { messageId: 'm1', text: 'hi', isCreatedByUser: true },
    { messageId: 'm2', content: [{ type: 'text', text: 'hello' }] },
  ],
} as unknown as t.TConversation;

const submission = {
  conversation: liveConversation,
  userMessage: { messageId: 'm3', text: 'follow up' },
  endpointOption: { endpoint: 'agents' },
} as unknown as t.TSubmission;

describe('createPayload', () => {
  it('builds a payload for a turn that is not the first', () => {
    const { payload, server } = createPayload(submission);
    expect(payload.conversationId).toBe('abc-123');
    expect(server).toContain('/agents');
  });

  it('carries a null conversationId for a conversation that has none yet', () => {
    const { payload } = createPayload({
      ...submission,
      conversation: { conversationId: null, endpoint: 'agents' },
    } as unknown as t.TSubmission);
    expect(payload.conversationId).toBeNull();
  });
});

describe('tPresetSchema', () => {
  it('accepts a live conversation, because a preset is settings and has no messages', () => {
    const preset = tPresetSchema.parse(liveConversation);
    expect(preset).not.toHaveProperty('messages');
    expect(preset.endpoint).toBe('agents');
  });
});
