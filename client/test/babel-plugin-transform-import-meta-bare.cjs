/**
 * Babel plugin that replaces a BARE `import.meta` with a CommonJS-safe stand-in.
 *
 * `babel-plugin-transform-vite-meta-env` and `babel-plugin-transform-import-meta`
 * both match the MEMBER form — `import.meta.env`, `import.meta.url`. Neither sees
 * `import.meta` aliased to a local first:
 *
 *   const m = import.meta          //  @hanzogui/telemetry's env.ts does this
 *   const e = m?.env
 *
 * Jest runs in CommonJS, where `import.meta` is a SyntaxError at parse time, so
 * that alias takes the whole suite down before a single test runs. Replacing the
 * bare node with `({ env: process.env })` gives it the SAME semantics the member
 * form already has under test — one vocabulary, whichever way the source spells it.
 *
 * Member forms are left alone: a MemberExpression is visited before its own
 * MetaProperty child, so the existing plugins have already rewritten those by the
 * time this runs, and the parent check below makes that explicit rather than
 * incidental.
 */
module.exports = function transformImportMetaBare({ types: t }) {
  return {
    name: 'transform-import-meta-bare',
    visitor: {
      MetaProperty(path) {
        const { node, parent } = path;
        if (node.meta.name !== 'import' || node.property.name !== 'meta') {
          return;
        }
        if (parent.type === 'MemberExpression' && parent.object === node) {
          return;
        }
        path.replaceWith(
          t.objectExpression([
            t.objectProperty(
              t.identifier('env'),
              t.memberExpression(t.identifier('process'), t.identifier('env')),
            ),
          ]),
        );
      },
    },
  };
};
