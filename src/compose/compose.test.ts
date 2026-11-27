import assert from 'node:assert/strict'
import { test } from 'node:test'

import { sends } from '@hanzo/ui/chat/pure'
import { processFilesBatch, readAttachment, READABLE } from './files.ts'

// Mock FileReader for Node test environment
class MockFileReader {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  result: string | ArrayBuffer | null = null

  readAsDataURL(file: any) {
    if (file._action === 'error') {
      queueMicrotask(() => this.onerror?.())
    } else if (file._action === 'abort') {
      queueMicrotask(() => this.onabort?.())
    } else {
      this.result = file._content !== undefined ? file._content : 'data:image/png;base64,mockpng'
      queueMicrotask(() => this.onload?.())
    }
  }

  readAsText(file: any) {
    if (file._action === 'error') {
      queueMicrotask(() => this.onerror?.())
    } else if (file._action === 'abort') {
      queueMicrotask(() => this.onabort?.())
    } else {
      this.result = file._content !== undefined ? file._content : 'mock content'
      queueMicrotask(() => this.onload?.())
    }
  }
}

// Install mock FileReader in test runner
;(globalThis as any).FileReader = MockFileReader

const mockFile = ({
  name,
  type = 'text/plain',
  size = 100,
  content,
  action,
}: {
  name: string
  type?: string
  size?: number
  content?: string
  action?: 'error' | 'abort'
}): File => {
  return {
    name,
    type,
    size,
    _content: content,
    _action: action,
  } as unknown as File
}

test('IME composition vs normal Enter vs Shift+Enter', () => {
  // IME composition should never trigger message send
  assert.equal(sends('Enter', { isComposing: true }), false, 'Enter while composing should not send')
  assert.equal(sends('Enter', { keyCode: 229 }), false, 'IME candidate keyCode 229 should not send')
  assert.equal(sends('Process', {}), false, 'Process key should not send')

  // Normal Enter sends
  assert.equal(sends('Enter', { isComposing: false }), true, 'Enter with isComposing:false should send')
  assert.equal(sends('Enter', {}), true, 'Standard Enter should send')

  // Shift+Enter inserts newline without sending
  assert.equal(sends('Enter', { shiftKey: true }), false, 'Shift+Enter should not send')

  // Alt+Enter does not send
  assert.equal(sends('Enter', { altKey: true }), false, 'Alt+Enter should not send')

  // Cmd / Ctrl + Enter force sends
  assert.equal(sends('Enter', { metaKey: true }), true, 'Cmd+Enter should send')
  assert.equal(sends('Enter', { ctrlKey: true }), true, 'Ctrl+Enter should send')
  assert.equal(sends('Enter', { metaKey: true, shiftKey: true }), true, 'Cmd+Shift+Enter should send')

  // Non-Enter keys do not send
  assert.equal(sends('a', {}), false, 'Regular character key should not send')
  assert.equal(sends('Tab', {}), false, 'Tab key should not send')
})

test('FileReader handles errors gracefully without stalling', async () => {
  const textErrFile = mockFile({ name: 'broken.txt', type: 'text/plain', action: 'error' })
  const textRes = await readAttachment(textErrFile)
  assert.equal(textRes.attachment, undefined)
  assert.equal(textRes.refusal, 'broken.txt could not be read, so it was not attached.')

  const imgErrFile = mockFile({ name: 'corrupted.png', type: 'image/png', action: 'error' })
  const imgRes = await readAttachment(imgErrFile)
  assert.equal(imgRes.attachment, undefined)
  assert.equal(imgRes.refusal, 'corrupted.png could not be read, so it was not attached.')
})

test('FileReader handles abort cleanly with settlement handler', async () => {
  const textAbortFile = mockFile({ name: 'aborted.txt', type: 'text/plain', action: 'abort' })
  const textRes = await readAttachment(textAbortFile)
  assert.equal(textRes.attachment, undefined)
  assert.equal(textRes.refusal, 'aborted.txt could not be read, so it was not attached.')

  const imgAbortFile = mockFile({ name: 'aborted.png', type: 'image/png', action: 'abort' })
  const imgRes = await readAttachment(imgAbortFile)
  assert.equal(imgRes.attachment, undefined)
  assert.equal(imgRes.refusal, 'aborted.png could not be read, so it was not attached.')
})

test('Empty text files attach successfully with empty content', async () => {
  const emptyFile = mockFile({ name: 'empty.txt', type: 'text/plain', size: 0, content: '' })
  const res = await readAttachment(emptyFile)
  assert.equal(res.refusal, undefined)
  assert.ok(res.attachment, 'attachment should be present')
  assert.equal(res.attachment.filename, 'empty.txt')
  assert.equal(res.attachment.bytes, 0)
  assert.equal(res.attachment.text, '')
})

test('Oversized files are refused before reading', async () => {
  const largeFile = mockFile({ name: 'giant.txt', type: 'text/plain', size: READABLE + 100 })
  const res = await readAttachment(largeFile)
  assert.equal(res.attachment, undefined)
  assert.equal(res.refusal, 'giant.txt is too large to read, so it was not attached.')
})

test('Mixed batch: successful attachments pass while failed ones report refusal', async () => {
  const batch = [
    mockFile({ name: 'notes.txt', type: 'text/plain', size: 50, content: 'meeting notes' }),
    mockFile({ name: 'empty.txt', type: 'text/plain', size: 0, content: '' }),
    mockFile({ name: 'too-big.log', type: 'text/plain', size: READABLE + 5000 }),
    mockFile({ name: 'bad-read.txt', type: 'text/plain', size: 100, action: 'error' }),
    mockFile({ name: 'cancelled.png', type: 'image/png', size: 200, action: 'abort' }),
    mockFile({ name: 'avatar.png', type: 'image/png', size: 300, content: 'data:image/png;base64,goodimage' }),
  ]

  const { incoming, refusal } = await processFilesBatch(batch)

  // 3 valid files should be attached: notes.txt, empty.txt, avatar.png
  assert.equal(incoming.length, 3, 'Should attach exactly 3 successful files')
  assert.equal(incoming[0].filename, 'notes.txt')
  assert.equal(incoming[0].text, 'meeting notes')

  assert.equal(incoming[1].filename, 'empty.txt')
  assert.equal(incoming[1].text, '')
  assert.equal(incoming[1].bytes, 0)

  assert.equal(incoming[2].filename, 'avatar.png')
  assert.equal(incoming[2].preview, 'data:image/png;base64,goodimage')

  // Failed files should register a refusal message
  assert.ok(refusal, 'Refusal message should be present')
  assert.ok(refusal.includes('could not be read') || refusal.includes('too large'))
})
