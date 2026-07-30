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
    '^~/(.*)$': '<rootDir>/src/$1',
    '^@hanzochat/data-provider/react-query$':
      '<rootDir>/../node_modules/@hanzochat/data-provider/src/react-query',
  },
  restoreMocks: true,
  testResultsProcessor: 'jest-junit',
  coverageReporters: ['text', 'cobertura', 'lcov'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      'jest-file-loader',
  },
  transformIgnorePatterns: ['node_modules/?!@zattoo/use-double-click'],
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect', '<rootDir>/test/setupTests.js'],
  clearMocks: true,
};
