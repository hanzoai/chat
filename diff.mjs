import { readFileSync } from 'node:fs';

const DIR = '/dev/shm/gotmp/claude-1000/-home-z/07ff2e34-435d-408d-a848-5c3b622c4950/scratchpad';
const before = JSON.parse(readFileSync(`${DIR}/before.json`, 'utf8'));
const after = JSON.parse(readFileSync(`${DIR}/after.json`, 'utf8'));

let diffs = 0;
let same = 0;

for (const vw of Object.keys(before.viewports)) {
  console.log(`\n################ VIEWPORT ${vw}`);
  const b = before.viewports[vw];
  const a = after.viewports[vw];
  const names = new Set([...Object.keys(b), ...Object.keys(a)]);

  for (const name of names) {
    const bm = b[name];
    const am = a[name];
    if (!bm || !am) {
      console.log(`\n  ?? ${name}: present in only one phase`);
      continue;
    }
    const lines = [];

    // Node kind is informational: the label legitimately changes text-node -> span.
    if (bm.tag !== am.tag || bm.nodeKind !== am.nodeKind) {
      lines.push(
        `      node: ${bm.tag ?? bm.nodeKind} -> ${am.tag ?? am.nodeKind}  (informational)`,
      );
    }
    for (const k of Object.keys(bm.style ?? {})) {
      const bv = (bm.style[k] ?? '').trim();
      const av = (am.style?.[k] ?? '').trim();
      if (bv !== av) lines.push(`      ${k}:  ${bv}   ->   ${av}`);
    }
    for (const k of Object.keys(bm.box ?? {})) {
      if (bm.box[k] !== am.box?.[k]) {
        lines.push(`      box.${k}:  ${bm.box[k]}   ->   ${am.box?.[k]}`);
      }
    }
    // Non-style probes (click, title) compare whole shape.
    for (const k of Object.keys(bm)) {
      if (['style', 'box', 'tag', 'nodeKind', 'text'].includes(k)) continue;
      if (JSON.stringify(bm[k]) !== JSON.stringify(am[k])) {
        lines.push(`      ${k}:  ${JSON.stringify(bm[k])}   ->   ${JSON.stringify(am[k])}`);
      }
    }

    const styleOnly = lines.filter((l) => !l.includes('(informational)'));
    if (styleOnly.length === 0) {
      same++;
      console.log(`\n  PASS  ${name}${lines.length ? '  ' + lines[0].trim() : ''}`);
    } else {
      diffs++;
      console.log(`\n  DIFF  ${name}`);
      lines.forEach((l) => console.log(l));
    }
  }
}

console.log(`\n================ ${same} identical, ${diffs} changed`);
console.log('before console errors:', before.consoleErrors);
console.log('after  console errors:', after.consoleErrors);
