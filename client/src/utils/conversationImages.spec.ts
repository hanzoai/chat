import { ContentTypes } from '@hanzochat/data-provider';
import type { TMessage } from '@hanzochat/data-provider';
import { collectConversationImages, resolveImageUrl } from './conversationImages';

const msg = (partial: Partial<TMessage>): TMessage => partial as TMessage;

describe('collectConversationImages', () => {
  it('returns [] for empty/undefined input', () => {
    expect(collectConversationImages(undefined)).toEqual([]);
    expect(collectConversationImages(null)).toEqual([]);
    expect(collectConversationImages([])).toEqual([]);
  });

  it('collects user-uploaded images from message.files', () => {
    const messages = [
      msg({
        files: [
          { file_id: 'f1', filepath: '/images/a.png', filename: 'a.png', type: 'image/png' },
          {
            file_id: 'd1',
            filepath: '/uploads/doc.pdf',
            filename: 'doc.pdf',
            type: 'application/pdf',
          },
        ],
      }),
    ];
    expect(collectConversationImages(messages)).toEqual([
      {
        file_id: 'f1',
        filepath: '/images/a.png',
        filename: 'a.png',
        type: 'image/png',
        height: undefined,
        width: undefined,
        source: undefined,
      },
    ]);
  });

  it('collects AI-generated images from message.attachments (image predicate)', () => {
    const messages = [
      msg({
        attachments: [
          {
            file_id: 'g1',
            filepath: '/images/gen.png',
            filename: 'gen.png',
            width: 1024,
            height: 1024,
            type: 'image_gen_oai',
          },
          /* Missing dimensions → not treated as a renderable image. */
          { file_id: 'g2', filepath: '/images/nodim.png', filename: 'nodim.png' },
        ] as TMessage['attachments'],
      }),
    ];
    const images = collectConversationImages(messages);
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      file_id: 'g1',
      filepath: '/images/gen.png',
      filename: 'gen.png',
      type: 'image/png',
      width: 1024,
      height: 1024,
    });
  });

  it('collects inline image_file content parts', () => {
    const messages = [
      msg({
        content: [
          { type: ContentTypes.TEXT, text: 'hi' },
          {
            type: ContentTypes.IMAGE_FILE,
            [ContentTypes.IMAGE_FILE]: {
              file_id: 'p1',
              filepath: '/images/part.webp',
              filename: 'part.webp',
              height: 512,
              width: 512,
            },
          },
        ] as TMessage['content'],
      }),
    ];
    const images = collectConversationImages(messages);
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      file_id: 'p1',
      filepath: '/images/part.webp',
      type: 'image/webp',
    });
  });

  it('dedupes by file_id (then filepath) preserving first occurrence order', () => {
    const messages = [
      msg({
        files: [{ file_id: 'f1', filepath: '/images/a.png', filename: 'a.png', type: 'image/png' }],
      }),
      msg({
        attachments: [
          { file_id: 'f1', filepath: '/images/a.png', filename: 'a.png', width: 1, height: 1 },
          { file_id: 'f2', filepath: '/images/b.png', filename: 'b.png', width: 1, height: 1 },
        ] as TMessage['attachments'],
      }),
    ];
    const images = collectConversationImages(messages);
    expect(images.map((i) => i.file_id)).toEqual(['f1', 'f2']);
  });

  it('skips images without a filepath', () => {
    const messages = [
      msg({
        files: [{ file_id: 'f1', filename: 'a.png', type: 'image/png' }] as TMessage['files'],
      }),
    ];
    expect(collectConversationImages(messages)).toEqual([]);
  });
});

describe('resolveImageUrl', () => {
  it('returns empty string for empty input', () => {
    expect(resolveImageUrl('')).toBe('');
    expect(resolveImageUrl(null)).toBe('');
    expect(resolveImageUrl(undefined)).toBe('');
  });

  it('passes through absolute URLs and data URIs untouched', () => {
    expect(resolveImageUrl('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
    expect(resolveImageUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('passes through non-/images/ paths untouched', () => {
    expect(resolveImageUrl('/uploads/x.png')).toBe('/uploads/x.png');
  });

  it('prefixes /images/ paths with the api base url', () => {
    /* In jsdom with no <base>, apiBaseUrl() resolves to '' so the path is preserved. */
    expect(resolveImageUrl('/images/x.png')).toBe('/images/x.png');
  });
});
