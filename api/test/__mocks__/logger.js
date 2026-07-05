jest.mock('winston', () => {
  // `winston.format(fn)` returns a *factory*; calling that factory yields a
  // Format instance whose `.transform` is `fn`. It never invokes `fn` at
  // construction (real winston only calls the transform per-log, with a real
  // `info`). Returning `fn` directly made any `redactFormat()` call run
  // `fn(undefined)` — which crashes at `info.level`. That is exactly what
  // `@librechat/data-schemas`'s own `config/winston` does at import time, so
  // every backend suite that pulls in `createModels`/`logger` failed to load.
  const mockFormatFunction = jest.fn((fn) => jest.fn(() => ({ transform: fn })));

  mockFormatFunction.colorize = jest.fn();
  mockFormatFunction.combine = jest.fn();
  mockFormatFunction.label = jest.fn();
  mockFormatFunction.timestamp = jest.fn();
  mockFormatFunction.printf = jest.fn();
  mockFormatFunction.errors = jest.fn();
  mockFormatFunction.splat = jest.fn();
  mockFormatFunction.json = jest.fn();
  return {
    format: mockFormatFunction,
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }),
    transports: {
      Console: jest.fn(),
      DailyRotateFile: jest.fn(),
      File: jest.fn(),
    },
    addColors: jest.fn(),
  };
});

jest.mock('winston-daily-rotate-file', () => {
  return jest.fn().mockImplementation(() => {
    return {
      level: 'error',
      filename: '../logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: 'format',
    };
  });
});

jest.mock('~/config', () => {
  return {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    },
  };
});

jest.mock('~/config/parsers', () => {
  return {
    redactMessage: jest.fn(),
    redactFormat: jest.fn(),
    debugTraverse: jest.fn(),
  };
});
