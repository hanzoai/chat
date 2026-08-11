import { ContentTypes } from '@hanzochat/data-provider';
import type { TMessage } from '@hanzochat/data-provider';
import { carriesContent } from '../useEventHandlers';

/**
 * `carriesContent` decides whether a finished turn is committed to the thread or
 * thrown away. It has to be right about a refusal, because a refusal is the one
 * answer a user cannot afford to lose: a 402 arrives as an error content part on a
 * turn the server never saved, and the old probe read `content[0].text.value` — a
 * shape only the assistants endpoint produces — so on agents it compared
 * `undefined === undefined` and reported "nothing came back" for every turn, good
 * or bad. hanzo.chat and lux.chat answered every question with a blank screen and
 * a composer holding the question back.
 */
const msg = (content: unknown): TMessage => ({ content } as unknown as TMessage);

describe('carriesContent', () => {
  it('keeps an error part — the refusal IS the answer', () => {
    expect(carriesContent(msg([{ type: ContentTypes.ERROR, error: 'Insufficient balance.' }]))).toBe(
      true,
    );
  });

  it('keeps agents text, whose text part is a bare string', () => {
    expect(carriesContent(msg([{ type: ContentTypes.TEXT, text: 'Hello' }]))).toBe(true);
  });

  it('keeps assistants text, whose text part is { value }', () => {
    expect(carriesContent(msg([{ type: ContentTypes.TEXT, text: { value: 'Hello' } }]))).toBe(true);
  });

  it('keeps a non-text part, such as a tool call', () => {
    expect(carriesContent(msg([{ type: ContentTypes.TOOL_CALL, tool_call: { name: 'x' } }]))).toBe(
      true,
    );
  });

  it('reports empty text as no content, in both shapes', () => {
    expect(carriesContent(msg([{ type: ContentTypes.TEXT, text: '' }]))).toBe(false);
    expect(carriesContent(msg([{ type: ContentTypes.TEXT, text: { value: '' } }]))).toBe(false);
  });

  it('reports a genuinely empty response as no content', () => {
    expect(carriesContent(msg([]))).toBe(false);
    expect(carriesContent(msg(undefined))).toBe(false);
    expect(carriesContent(undefined)).toBe(false);
    expect(carriesContent(null)).toBe(false);
  });

  it('ignores a null part rather than counting it as content', () => {
    expect(carriesContent(msg([null]))).toBe(false);
    expect(carriesContent(msg([null, { type: ContentTypes.TEXT, text: 'Hi' }]))).toBe(true);
  });

  it('finds content past the first part', () => {
    expect(
      carriesContent(
        msg([
          { type: ContentTypes.TEXT, text: '' },
          { type: ContentTypes.ERROR, error: 'boom' },
        ]),
      ),
    ).toBe(true);
  });

  /**
   * The exact frame production sent: an empty `text` field beside the refusal in
   * `content[0]`. The whole exchange used to vanish on this input.
   */
  it('keeps the production 402 frame — empty text, error in content[0]', () => {
    const frame = {
      text: '',
      content: [
        {
          type: ContentTypes.ERROR,
          error: JSON.stringify({
            error: 'Insufficient balance. Add credits to your wallet at https://pay.hanzo.ai',
            code: 'insufficient_quota',
          }),
        },
      ],
    } as unknown as TMessage;
    expect(carriesContent(frame)).toBe(true);
  });
});
