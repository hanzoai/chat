import { framable } from '../preview';

describe('framable', () => {
  it('keeps an absolute https URL', () => {
    expect(framable('https://hanzo.ai/chat')).toBe('https://hanzo.ai/chat');
  });

  it('keeps http, because a local dev server is the common preview', () => {
    expect(framable('http://localhost:3080/')).toBe('http://localhost:3080/');
  });

  it('assumes https for a bare host, which is what people paste', () => {
    expect(framable('hanzo.ai')).toBe('https://hanzo.ai/');
    expect(framable('  hanzo.ai/chat  ')).toBe('https://hanzo.ai/chat');
  });

  it('refuses javascript:, which runs in the EMBEDDER before any sandbox', () => {
    expect(framable('javascript:alert(document.cookie)')).toBeNull();
    expect(framable('JavaScript:alert(1)')).toBeNull();
  });

  it('refuses data: and blob:, which can inherit the embedder origin', () => {
    expect(framable('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(framable('blob:https://hanzo.chat/abc')).toBeNull();
  });

  it('refuses file: and every other scheme it was not told to allow', () => {
    expect(framable('file:///etc/passwd')).toBeNull();
    expect(framable('ftp://hanzo.ai')).toBeNull();
    expect(framable('vbscript:msgbox(1)')).toBeNull();
  });

  it('refuses empty and unparseable input', () => {
    expect(framable('')).toBeNull();
    expect(framable('   ')).toBeNull();
    expect(framable('https://')).toBeNull();
  });
});
