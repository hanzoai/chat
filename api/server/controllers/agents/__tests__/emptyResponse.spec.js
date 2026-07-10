const { ContentTypes } = require('librechat-data-provider');
const { isEmptyAgentResponse } = require('../emptyResponse');

describe('isEmptyAgentResponse', () => {
  it('treats nullish responses as empty', () => {
    expect(isEmptyAgentResponse(undefined)).toBe(true);
    expect(isEmptyAgentResponse(null)).toBe(true);
    expect(isEmptyAgentResponse({})).toBe(true);
  });

  it('is empty when content array is empty and text is blank', () => {
    // The exact silent-failure shape: agents endpoint sets text:'' and the
    // stream yielded zero deltas, so content is [].
    expect(isEmptyAgentResponse({ text: '', content: [] })).toBe(true);
    expect(isEmptyAgentResponse({ text: '   ', content: [] })).toBe(true);
  });

  it('is empty when the only content part is a blank text part', () => {
    expect(
      isEmptyAgentResponse({ text: '', content: [{ type: ContentTypes.TEXT, text: '' }] }),
    ).toBe(true);
    expect(
      isEmptyAgentResponse({ text: '', content: [{ type: ContentTypes.TEXT, text: '  \n ' }] }),
    ).toBe(true);
  });

  it('is NOT empty when text is present', () => {
    expect(isEmptyAgentResponse({ text: 'hello' })).toBe(false);
    expect(isEmptyAgentResponse({ text: 'hi', content: [] })).toBe(false);
  });

  it('is NOT empty when a text content part carries content', () => {
    expect(
      isEmptyAgentResponse({ text: '', content: [{ type: ContentTypes.TEXT, text: 'answer' }] }),
    ).toBe(false);
  });

  it('is NOT empty when an error content part is present', () => {
    // The gateway-threw path pushes an ERROR part; that must still render (never
    // be re-flagged as empty).
    expect(
      isEmptyAgentResponse({
        text: '',
        content: [{ type: ContentTypes.ERROR, error: 'insufficient credits' }],
      }),
    ).toBe(false);
  });

  it('is NOT empty when a tool_call part is present (no text yet)', () => {
    expect(
      isEmptyAgentResponse({
        text: '',
        content: [{ type: ContentTypes.TOOL_CALL, tool_call: { name: 'search' } }],
      }),
    ).toBe(false);
  });

  it('is NOT empty when a non-blank string part is present', () => {
    expect(isEmptyAgentResponse({ text: '', content: ['done'] })).toBe(false);
  });
});
