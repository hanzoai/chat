import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Everyone keys a brand-new conversation the same way, or the writes land in an
 * atom the reader is not watching.
 *
 * `ephemeralAgentByConvoId` is an atomFamily: a different key is a different
 * atom, silently. There is no error, no type complaint, and no warning — the
 * reader simply sees the default forever.
 *
 * Measured 2026-08-08: `DragDropModal` read `conversationId ?? ''` while every
 * writer used `conversationId ?? Constants.NEW_CONVO` — useDragHelpers and
 * useFileHandling when a tool resource is switched on, plus BadgeRowContext,
 * useMCPSelect and useToolToggle. On a NEW chat the modal therefore subscribed
 * to an atom nobody writes: choosing "file search" in that very modal left the
 * permission check beside it reading an empty ephemeral agent. It agreed with
 * the rest the moment a conversation had an id, which is exactly why it lived
 * so long — the broken case is the first drop into a fresh chat.
 *
 * So the invariant is the FALLBACK, not the call: whatever the expression, a
 * missing conversation id must resolve to `Constants.NEW_CONVO`.
 */
const root = join(__dirname, '../../..');

/** Every line that keys the family, from source rather than a hand-kept list. */
function callSites(): Array<{ file: string; line: string }> {
  const out = execFileSync(
    'git',
    ['grep', '-n', 'ephemeralAgentByConvoId(', '--', 'src'],
    { cwd: root, encoding: 'utf8' },
  );
  return out
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [file, , ...rest] = l.split(':');
      return { file, line: rest.join(':') };
    })
    .filter(({ file }) => !file.includes('__tests__') && !file.endsWith('store/agents.ts'));
}

describe('one key for a new conversation', () => {
  it('finds the call sites at all (a silent empty sweep proves nothing)', () => {
    expect(callSites().length).toBeGreaterThanOrEqual(6);
  });

  it('never falls back to the empty string', () => {
    const bad = callSites().filter(({ line }) => /ephemeralAgentByConvoId\([^)]*\?\?\s*['"]/.test(line));
    expect(bad).toEqual([]);
  });

  it('uses Constants.NEW_CONVO wherever it supplies a fallback', () => {
    const withFallback = callSites().filter(({ line }) => line.includes('??'));
    expect(withFallback.length).toBeGreaterThan(0);
    for (const { file, line } of withFallback) {
      expect(`${file}: ${line.trim()}`).toContain('Constants.NEW_CONVO');
    }
  });

  it('and DragDropModal specifically — the one that was wrong', () => {
    const src = readFileSync(
      join(root, 'src/components/Chat/Input/Files/DragDropModal.tsx'),
      'utf8',
    );
    expect(src).toContain('ephemeralAgentByConvoId(conversationId ?? Constants.NEW_CONVO)');
  });
});
