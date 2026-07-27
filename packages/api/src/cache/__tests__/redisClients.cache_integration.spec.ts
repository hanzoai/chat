import type { KV, Cluster } from '@hanzo/kv';
import type { RedisClientType, RedisClusterType } from '@redis/client';

type RedisClient = RedisClientType | RedisClusterType | KV | Cluster;

describe('redisClients Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let kvClient: KV | Cluster | null = null;
  let keyvRedisClient: RedisClientType | RedisClusterType | null = null;

  // Helper function to test set/get/delete operations
  const testRedisOperations = async (
    client: RedisClient,
    keyPrefix: string,
    readyPromise?: Promise<void>,
  ): Promise<void> => {
    // Wait for connection and topology discovery to complete
    if (readyPromise) await readyPromise;

    const testKey = `${keyPrefix}-test-key`;
    const testValue = `${keyPrefix}-test-value`;

    // Test set operation
    await client.set(testKey, testValue);

    // Test get operation
    const result = await client.get(testKey);
    expect(result).toBe(testValue);

    // Test delete operation
    const deleteResult = await client.del(testKey);
    expect(deleteResult).toBe(1);

    // Verify key is deleted
    const deletedResult = await client.get(testKey);
    expect(deletedResult).toBeNull();
  };

  beforeEach(() => {
    originalEnv = { ...process.env };

    // Set common test configuration with fallback defaults for local testing
    process.env.REDIS_PING_INTERVAL = '1000';
    process.env.REDIS_KEY_PREFIX = 'KV-Integration-Test';
    process.env.REDIS_RETRY_MAX_ATTEMPTS = '5';
    process.env.USE_REDIS = process.env.USE_REDIS || 'true';
    process.env.USE_REDIS_CLUSTER = process.env.USE_REDIS_CLUSTER || 'false';
    process.env.REDIS_URI = process.env.REDIS_URI || 'redis://127.0.0.1:6379';

    // Clear module cache to reload module
    jest.resetModules();
  });

  afterEach(async () => {
    // Clean up test keys using the prefix
    if (kvClient && kvClient.status === 'ready') {
      try {
        const keys = await kvClient.keys('KV-Integration-Test::*');
        if (keys.length > 0) {
          await kvClient.del(...keys);
        }
      } catch (error: any) {
        console.warn('Error cleaning up test keys:', error.message);
      }
    }

    // Cleanup KV connections
    if (kvClient) {
      try {
        if (kvClient.status === 'ready') {
          kvClient.disconnect();
        }
      } catch (error: any) {
        console.warn('Error disconnecting @hanzo/kv client:', error.message);
      }
      kvClient = null;
    }

    if (keyvRedisClient) {
      try {
        // Try to disconnect - keyv/redis client doesn't have an isReady property
        await keyvRedisClient.disconnect();
      } catch (error: any) {
        console.warn('Error disconnecting keyv redis client:', error.message);
      }
      keyvRedisClient = null;
    }

    process.env = originalEnv;
    jest.resetModules();
  });

  describe('@hanzo/kv Client Tests', () => {
    describe('when USE_REDIS is false', () => {
      test('should have null client', async () => {
        process.env.USE_REDIS = 'false';

        const clients = await import('../redisClients');
        kvClient = clients.kvClient;

        expect(kvClient).toBeNull();
      });
    });

    describe('when connecting to a KV instance', () => {
      test('should connect and perform set/get/delete operations', async () => {
        const clients = await import('../redisClients');
        kvClient = clients.kvClient;
        await testRedisOperations(kvClient!, '@hanzo/kv-single');
      });
    });

    describe('when connecting to a KV cluster', () => {
      test('should connect to cluster and perform set/get/delete operations', async () => {
        process.env.USE_REDIS_CLUSTER = 'true';
        process.env.REDIS_URI =
          'redis://127.0.0.1:7001,redis://127.0.0.1:7002,redis://127.0.0.1:7003';

        const clients = await import('../redisClients');
        kvClient = clients.kvClient;
        await testRedisOperations(kvClient!, '@hanzo/kv-cluster');
      });
    });
  });

  describe('keyvRedisClient Tests', () => {
    describe('when USE_REDIS is false', () => {
      test('should have null client', async () => {
        process.env.USE_REDIS = 'false';

        const clients = await import('../redisClients');
        keyvRedisClient = clients.keyvRedisClient;
        expect(keyvRedisClient).toBeNull();
      });
    });

    describe('when connecting to a KV instance', () => {
      test('should connect and perform set/get/delete operations', async () => {
        const clients = await import('../redisClients');
        keyvRedisClient = clients.keyvRedisClient;
        await testRedisOperations(keyvRedisClient!, 'keyv-single', clients.keyvRedisClientReady!);
      });
    });

    describe('when connecting to a KV cluster', () => {
      test('should connect to cluster and perform set/get/delete operations', async () => {
        process.env.USE_REDIS_CLUSTER = 'true';
        process.env.REDIS_URI =
          'redis://127.0.0.1:7001,redis://127.0.0.1:7002,redis://127.0.0.1:7003';

        const clients = await import('../redisClients');
        keyvRedisClient = clients.keyvRedisClient;
        await testRedisOperations(keyvRedisClient!, 'keyv-cluster', clients.keyvRedisClientReady!);
      });
    });
  });
});
