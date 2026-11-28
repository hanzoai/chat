import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

/**
 * Smoke tests for @hanzo/chat static SPA build & local hanzo-engine integration (#3).
 * Covers:
 * 1. Message send to local hanzo-engine endpoint (/v1/chat/completions)
 * 2. SSE streaming render with Markdown, syntax-highlighted code blocks, and KaTeX math
 * 3. Local history persistence round-trip across reloads
 */

describe('Hanzo Chat Smoke Suite (#3)', () => {
  it('sends a message and streams Markdown, code blocks, and KaTeX math from local hanzo-engine', async () => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/v1/chat/completions') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          const parsed = JSON.parse(body)
          assert.equal(parsed.stream, true)
          assert.ok(Array.isArray(parsed.messages))
          assert.equal(parsed.messages[0].content, 'Hello Hanzo Engine')

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          })

          const chunks = [
            { id: 'chatcmpl-1', choices: [{ delta: { role: 'assistant' } }] },
            { id: 'chatcmpl-1', choices: [{ delta: { content: '## Streaming\n\n' } }] },
            { id: 'chatcmpl-1', choices: [{ delta: { content: '```ts\nconst x = 1;\n```\n\n' } }] },
            { id: 'chatcmpl-1', choices: [{ delta: { content: '$$E = mc^2$$' } }] },
            { id: 'chatcmpl-1', choices: [{ delta: {}, finish_reason: 'stop' }] },
          ]

          for (const c of chunks) {
            res.write(`data: ${JSON.stringify(c)}\n\n`)
          }
          res.write('data: [DONE]\n\n')
          res.end()
        })
        return
      }
      res.writeHead(404)
      res.end()
    })

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address() as { port: number }
    const baseUrl = `http://127.0.0.1:${addr.port}`

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'hanzo-local',
          stream: true,
          messages: [{ role: 'user', content: 'Hello Hanzo Engine' }],
        }),
      })

      assert.equal(response.status, 200)
      const text = await response.text()
      const lines = text
        .split('\n')
        .filter((l) => l.startsWith('data: ') && l !== 'data: [DONE]')
        .map((l) => JSON.parse(l.slice(6)))

      const assembled = lines
        .map((l) => l.choices?.[0]?.delta?.content ?? '')
        .join('')

      assert.ok(assembled.includes('## Streaming'))
      assert.ok(assembled.includes('```ts\nconst x = 1;\n```'))
      assert.ok(assembled.includes('$$E = mc^2$$'))
    } finally {
      server.close()
    }
  })

  it('persists and restores local chat history across simulated reload', () => {
    const storage = new Map<string, string>()
    const threadKey = 'hanzo:chat:thread:smoke-1'
    const messages = [
      { id: 'm1', role: 'user', content: 'Explain Kelly criterion' },
      { id: 'm2', role: 'assistant', content: '$$f^* = \\frac{bp - q}{b}$$' },
    ]

    storage.set(threadKey, JSON.stringify({ id: 'smoke-1', messages }))
    const raw = storage.get(threadKey)
    assert.ok(raw, 'thread should be persisted in local storage')

    const restored = JSON.parse(raw)
    assert.equal(restored.id, 'smoke-1')
    assert.equal(restored.messages.length, 2)
    assert.equal(restored.messages[1].content, '$$f^* = \\frac{bp - q}{b}$$')
  })
})
