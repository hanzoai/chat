// Jest setupFiles: runs before any test-module import, so crypto/index.ts reads
// these at module-load time. Only sets test defaults when unset (never clobbers
// a value a specific test provides). AES-256: 64-hex key, 32-hex iv.
process.env.CREDS_KEY = process.env.CREDS_KEY || 'f'.repeat(64);
process.env.CREDS_IV = process.env.CREDS_IV || '0'.repeat(32);
