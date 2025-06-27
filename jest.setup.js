// Jest setup file for global test configuration

// Increase timeout for slower tests
jest.setTimeout(30000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DOMAIN_CLIENT = 'http://localhost:3080';
process.env.DOMAIN_SERVER = 'http://localhost:3080';

// Suppress console errors in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: (callback, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        try {
          const result = callback();
          if (result) {
            clearInterval(interval);
            resolve(result);
          } else if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            reject(new Error('Timeout waiting for condition'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 100);
    });
  },

  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@hanzo.ai',
    name: 'Test User',
    role: 'user',
    ...overrides,
  }),

  // Create mock conversation
  createMockConversation: (overrides = {}) => ({
    conversationId: 'test-conversation-id',
    title: 'Test Conversation',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
};

// Setup fetch mock
global.fetch = jest.fn();

// Setup window mock for client tests
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
