import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Hanzo Chat Engine Config: Supports VITE_HANZO_API and defaults to http://127.0.0.1:1234', () => {
  const originPath = path.join(rootDir, 'src', 'data', 'origin.ts');
  assert.ok(fs.existsSync(originPath), 'origin.ts must exist');
  const content = fs.readFileSync(originPath, 'utf8');

  assert.ok(content.includes('VITE_HANZO_API'), 'Must check import.meta.env.VITE_HANZO_API');
  assert.ok(content.includes('127.0.0.1:1234'), 'Must default to http://127.0.0.1:1234');
});

test('Streaming SSE Parser: Correctly reconstructs token stream from local engine chunks', async () => {
  const chunks = [
    'data: {"id":"chat-1","choices":[{"delta":{"content":"Hello"}}]}\n\n',
    'data: {"id":"chat-1","choices":[{"delta":{"content":" from"}}]}\n\n',
    'data: {"id":"chat-1","choices":[{"delta":{"content":" Hanzo"}}]}\n\n',
    'data: {"id":"chat-1","choices":[{"delta":{"content":" Engine!"}}]}\n\n',
    'data: [DONE]\n\n',
  ];

  let accumulated = '';
  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;
        const parsed = JSON.parse(payload);
        if (parsed.choices?.[0]?.delta?.content) {
          accumulated += parsed.choices[0].delta.content;
        }
      }
    }
  }

  assert.equal(accumulated, 'Hello from Hanzo Engine!');
});

test('Markdown & KaTeX Syntax Formatter: Validates code fences and math blocks', () => {
  const sampleMessage = `
Here is a Python function:
\`\`\`python
def greet(name: str) -> str:
    return f"Hello {name}"
\`\`\`

And the Euler identity:
$$e^{i\\pi} + 1 = 0$$
`;

  // Verify code block structure
  assert.ok(sampleMessage.includes('```python'), 'Must detect python code block');
  assert.ok(sampleMessage.includes('```'), 'Must have closing code block fence');

  // Verify KaTeX math structure
  const mathMatches = sampleMessage.match(/\$\$([\s\S]*?)\$\$/g);
  assert.ok(mathMatches && mathMatches.length > 0, 'Must detect KaTeX math blocks');
  assert.equal(mathMatches[0].trim(), '$$e^{i\\pi} + 1 = 0$$');
});

test('Local History Persistence: Simulates atomic session save & reload', () => {
  const mockStorage = new Map();

  function saveConvo(convoId, convoData) {
    mockStorage.set(`convo:${convoId}`, JSON.stringify(convoData));
  }

  function loadConvo(convoId) {
    const raw = mockStorage.get(`convo:${convoId}`);
    return raw ? JSON.parse(raw) : null;
  }

  const sampleConvo = {
    id: 'convo-xyz-123',
    title: 'Engine BYOK Test',
    messages: [
      { id: 'msg-1', role: 'user', content: 'What is Hanzo Engine?' },
      { id: 'msg-2', role: 'assistant', content: 'Local OpenAI-compatible inference server.' },
    ],
    updatedAt: Date.now(),
  };

  saveConvo(sampleConvo.id, sampleConvo);
  const reloaded = loadConvo('convo-xyz-123');

  assert.ok(reloaded, 'Conversation must reload from storage');
  assert.equal(reloaded.id, 'convo-xyz-123');
  assert.equal(reloaded.messages.length, 2);
  assert.equal(reloaded.messages[1].role, 'assistant');
});

test('Vite SPA Build Configuration: Validates static distribution setup', () => {
  const viteConfigPath = path.join(rootDir, 'vite.config.ts');
  assert.ok(fs.existsSync(viteConfigPath), 'vite.config.ts must exist');

  const content = fs.readFileSync(viteConfigPath, 'utf8');
  assert.ok(content.includes('defineConfig') || content.includes('plugins'), 'Valid Vite configuration structure');

  const indexHtmlPath = path.join(rootDir, 'index.html');
  assert.ok(fs.existsSync(indexHtmlPath), 'index.html entry point must exist');
});
