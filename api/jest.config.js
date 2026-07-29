module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  roots: ['<rootDir>'],
  coverageDirectory: 'coverage',
  testTimeout: 30000, // 30 seconds timeout for all tests
  setupFiles: ['./test/jestSetup.js', './test/__mocks__/logger.js'],
  moduleNameMapper: {
    '~/(.*)': '<rootDir>/$1',
    '~/data/auth.json': '<rootDir>/__mocks__/auth.mock.json',
    '^openid-client/passport$': '<rootDir>/test/__mocks__/openid-client-passport.js', // Mock for the passport strategy part
    '^openid-client$': '<rootDir>/test/__mocks__/openid-client.js',
  },
  /* `@hanzochat/agents` requires `@mistralai/mistralai`, whose entry point is
   * ESM. Left untransformed it throws `SyntaxError: Unexpected token 'export'`
   * at import time, which jest counts as one failed suite and ZERO tests — so
   * every suite that reaches a model or an agent reports nothing at all. */
  transformIgnorePatterns: [
    '/node_modules/(?!(openid-client|oauth4webapi|jose|@mistralai/mistralai)/).*/',
  ],
};
