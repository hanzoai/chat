/** v0.8.3-rc1 */
module.exports = {
  roots: ['<rootDir>/src'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3080',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/node_modules/',
    '!src/**/*.css.d.ts',
    '!src/**/*.d.ts',
  ],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/test/setupTests.js'],
  //  Todo: Add coverageThreshold once we have enough coverage
  //  Note: eventually we want to have these values set to 80%
  // coverageThreshold: {
  //   global: {
  //     functions: 9,
  //     lines: 40,
  //     statements: 40,
  //     branches: 12,
  //   },
  // },
  moduleNameMapper: {
    '\\.(css)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'jest-file-loader',
    '^test/(.*)$': '<rootDir>/test/$1',
    // `src/locales/localeLoaders.ts` enumerates lazy locales via
    // `import.meta.glob`, which babel-jest cannot parse. Map that ONE module
    // (unique specifier — only i18n.ts imports it) to an fs-backed twin with
    // the identical shape, so the real i18n module runs under tests.
    '^\\./localeLoaders$': '<rootDir>/test/localeLoaders.node.ts',
    // The @hanzo/ui 8.x primitives are backed by @hanzo/gui, which is authored
    // against the react-native API. vite.config.ts resolves that for the bundle
    // (alias + `.web.*` first in resolve.extensions); jest has its own resolver
    // and needs the same two facts stated again, or a test that renders any 8.x
    // primitive pulls in native-only code.
    '^react-native$': 'react-native-web',
    // react-native-svg's `react-native` field points at `src/index.ts`, so jest
    // walks into raw TypeScript in node_modules and then into Flow-typed
    // react-native source that babel-jest cannot parse. jsdom renders real SVG
    // and no test here asserts on SVG internals, so it gets a DOM stand-in.
    // See the file header for why it is in the graph at all.
    '^react-native-svg$': '<rootDir>/test/react-native-svg.stub.js',
    '^~/(.*)$': '<rootDir>/src/$1',
    // Map straight at the workspace SOURCE, not at a node_modules path. pnpm's
    // hoisted linker puts the workspace link in client/node_modules, not the repo
    // root, so '<rootDir>/../node_modules/@hanzochat/data-provider' does not exist
    // after a clean install and every suite importing this specifier failed to
    // resolve. The source path is the same file either way and does not depend on
    // how the linker happened to lay node_modules out.
    '^@hanzochat/data-provider/react-query$':
      '<rootDir>/../packages/data-provider/src/react-query',
  },
  restoreMocks: true,
  testResultsProcessor: 'jest-junit',
  coverageReporters: ['text', 'cobertura', 'lcov'],
  transform: {
    // `.mjs`/`.cjs` are in here because @hanzo/gui ships its ESM entry as
    // `dist/esm/index.mjs`. The old pattern only matched .js/.jsx/.ts/.tsx, so
    // NO transformer claimed .mjs and any test that rendered an @hanzo/ui
    // primitive died on `Cannot use import statement outside a module` — from
    // inside node_modules, where the stack points at the test's import line and
    // not at the real cause.
    // `configFile` is NOT redundant with having a babel.config.cjs beside this
    // one. Babel only applies a ROOT config to files under its root, and every
    // Hanzo package resolves to `chat/node_modules/` — a level ABOVE this
    // client/ root. So babel-jest transformed those files with NO config at
    // all: the `babel-plugin-transform-import-meta` listed right there never
    // ran on them, and `@hanzogui/telemetry/dist/esm/env.mjs` died on
    // `Cannot use 'import.meta' outside a module`. That single unparsed file is
    // what made `@hanzo/ui/product` unimportable and pinned this app three
    // minor versions behind the rest of the fleet — the ceiling was blamed on
    // jsdom's CSS parser, which (measured) parses the modern syntax fine.
    // Naming the config forces it onto every transformed file, wherever it lives.
    '\\.[mc]?[jt]sx?$': ['babel-jest', { configFile: require.resolve('./babel.config.cjs') }],
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'jest-file-loader',
  },
  // Was `['node_modules/?!@zattoo/use-double-click']` — a negative lookahead
  // with the parentheses missing, so it read as "node_modules" + an optional
  // slash + the LITERAL text "!@zattoo/use-double-click". No path on earth
  // matches that, so the list ignored nothing and every node_modules file was
  // being transformed. That accident is load-bearing (the ESM-only Hanzo
  // packages need transforming), so this keeps the same effective behaviour and
  // just says so honestly, instead of leaving a broken regex that looks
  // deliberate.
  transformIgnorePatterns: [],
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect', '<rootDir>/test/setupTests.js'],
  clearMocks: true,
};
