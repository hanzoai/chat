/* babel is used for backend unit testing.

   The api workspace is CommonJS, so this exists for exactly one reason: a
   dependency reached through `require` that ships ESM. Without a babel config
   `babel-jest` is a no-op, so `transformIgnorePatterns` alone cannot help —
   the ESM stays ESM and node throws `SyntaxError: Unexpected token 'export'`
   at import time, which jest counts as one failed suite and ZERO tests. */
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
