import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')

test('SPA boot: core entrypoints and routes exist', () => {
  for (const rel of ['src/main.tsx', 'src/app.tsx', 'src/routes.tsx', 'index.html']) {
    assert.equal(existsSync(resolve(root, rel)), true, `Missing ${rel}`)
  }
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  assert.ok(pkg.dependencies['@hanzo/gui'], '@hanzo/gui dependency present')
  assert.ok(pkg.dependencies['@hanzo/ui'], '@hanzo/ui dependency present')
})

test('streaming & chat surface: thread, compose, channels, and agents modules exist', () => {
  for (const dir of ['src/thread', 'src/compose', 'src/channels', 'src/agents']) {
    assert.equal(existsSync(resolve(root, dir)), true, `Missing ${dir}`)
  }
})
