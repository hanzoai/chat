/**
 * `import.meta` is illegal in the CJS modules jest builds, and the two plugins
 * below only rewrite the shapes they were written for — `import.meta.url` and
 * `import.meta.env`. Hanzo packages ship `import.meta?.env`, an OPTIONAL member
 * expression, which both skip. One unrewritten occurrence in
 * `@hanzogui/telemetry/dist/esm/env.mjs` is the whole reason `@hanzo/ui/product`
 * could not be imported here and this app sat three minors behind the fleet.
 *
 * This handles the node itself (`MetaProperty`), so it does not care what is
 * chained onto it. Tests get an empty env, which is what they want: the real
 * values come from Vite at build time and telemetry must not phone home from a
 * unit test.
 */
const transformImportMetaNode = () => ({
  name: 'hanzo-transform-import-meta-node',
  visitor: {
    MetaProperty(path) {
      path.replaceWithSourceString("({ env: {}, url: 'file:///' })");
    },
  },
});

/*

babel is used for frontend unit testing

*/
module.exports = {
  presets: [
    ['@babel/preset-env', { 'targets': { 'node': 'current' } }], //compiling ES2015+ syntax
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  /*
      Babel's code transformations are enabled by applying plugins (or presets) to your configuration file.
  */
  plugins: [
    '@babel/plugin-transform-runtime',
    transformImportMetaNode,
    'babel-plugin-transform-import-meta',
    'babel-plugin-transform-vite-meta-env',
    'babel-plugin-replace-ts-export-assignment',
    [
      'babel-plugin-root-import',
      {
        'rootPathPrefix': '~/',
        'rootPathSuffix': './src',
      },
    ],
  ],
};
