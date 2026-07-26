import KV from '@hanzo/kv';
import type { KV, Cluster } from '@hanzo/kv';
import { logger } from '@hanzochat/data-schemas';
import { createClient, createCluster } from '@keyv/redis';
import type { RedisClientType, RedisClusterType } from '@redis/client';
import type { ScanCommandOptions } from '@redis/client/dist/lib/commands/SCAN';
import { cacheConfig } from './cacheConfig';

const urls = cacheConfig.REDIS_URI?.split(',').map((uri) => new URL(uri)) || [];
const username = urls?.[0]?.username || cacheConfig.REDIS_USERNAME;
const password = urls?.[0]?.password || cacheConfig.REDIS_PASSWORD;
const ca = cacheConfig.REDIS_CA;

let kvClient: KV | Cluster | null = null;
if (cacheConfig.USE_REDIS) {
  const redisOptions: Record<string, unknown> = {
    username: username,
    password: password,
    tls: ca ? { ca } : undefined,
    keyPrefix: `${cacheConfig.REDIS_KEY_PREFIX}${cacheConfig.GLOBAL_PREFIX_SEPARATOR}`,
    maxListeners: cacheConfig.REDIS_MAX_LISTENERS,
    retryStrategy: (times: number) => {
      if (
        cacheConfig.REDIS_RETRY_MAX_ATTEMPTS > 0 &&
        times > cacheConfig.REDIS_RETRY_MAX_ATTEMPTS
      ) {
        logger.error(
          `@hanzo/kv giving up after ${cacheConfig.REDIS_RETRY_MAX_ATTEMPTS} reconnection attempts`,
        );
        return null;
      }
      const base = Math.min(Math.pow(2, times) * 50, cacheConfig.REDIS_RETRY_MAX_DELAY);
      const jitter = Math.floor(Math.random() * Math.min(base, 1000));
      const delay = Math.min(base + jitter, cacheConfig.REDIS_RETRY_MAX_DELAY);
      logger.info(`@hanzo/kv reconnecting... attempt ${times}, delay ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        logger.warn('@hanzo/kv reconnecting due to READONLY error');
        return 2; // Return retry delay instead of boolean
      }
      return false;
    },
    enableOfflineQueue: cacheConfig.REDIS_ENABLE_OFFLINE_QUEUE,
    connectTimeout: cacheConfig.REDIS_CONNECT_TIMEOUT,
    maxRetriesPerRequest: 3,
  };

  kvClient =
    urls.length === 1 && !cacheConfig.USE_REDIS_CLUSTER
      ? new KV(cacheConfig.REDIS_URI!, redisOptions)
      : new KV.Cluster(
          urls.map((url) => ({ host: url.hostname, port: parseInt(url.port, 10) || 6379 })),
          {
            ...(cacheConfig.REDIS_USE_ALTERNATIVE_DNS_LOOKUP
              ? {
                  dnsLookup: (
                    address: string,
                    callback: (err: Error | null, address: string) => void,
                  ) => callback(null, address),
                }
              : {}),
            redisOptions,
            clusterRetryStrategy: (times: number) => {
              if (
                cacheConfig.REDIS_RETRY_MAX_ATTEMPTS > 0 &&
                times > cacheConfig.REDIS_RETRY_MAX_ATTEMPTS
              ) {
                logger.error(
                  `@hanzo/kv cluster giving up after ${cacheConfig.REDIS_RETRY_MAX_ATTEMPTS} reconnection attempts`,
                );
                return null;
              }
              const base = Math.min(Math.pow(2, times) * 100, cacheConfig.REDIS_RETRY_MAX_DELAY);
              const jitter = Math.floor(Math.random() * Math.min(base, 1000));
              const delay = Math.min(base + jitter, cacheConfig.REDIS_RETRY_MAX_DELAY);
              logger.info(`@hanzo/kv cluster reconnecting... attempt ${times}, delay ${delay}ms`);
              return delay;
            },
            enableOfflineQueue: cacheConfig.REDIS_ENABLE_OFFLINE_QUEUE,
          },
        );

  kvClient.on('error', (err) => {
    logger.error('@hanzo/kv client error:', err);
  });

  kvClient.on('connect', () => {
    logger.info('@hanzo/kv client connected');
  });

  kvClient.on('ready', () => {
    logger.info('@hanzo/kv client ready');
  });

  kvClient.on('reconnecting', (delay: number) => {
    logger.info(`@hanzo/kv client reconnecting in ${delay}ms`);
  });

  kvClient.on('close', () => {
    logger.warn('@hanzo/kv client connection closed');
  });

  /** Ping Interval to keep the KV server connection alive (if enabled) */
  let pingInterval: NodeJS.Timeout | null = null;
  const clearPingInterval = () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  };

  if (cacheConfig.REDIS_PING_INTERVAL > 0) {
    pingInterval = setInterval(() => {
      if (kvClient && kvClient.status === 'ready') {
        kvClient.ping().catch((err) => {
          logger.error('@hanzo/kv ping failed:', err);
        });
      }
    }, cacheConfig.REDIS_PING_INTERVAL * 1000);
    kvClient.on('close', clearPingInterval);
    kvClient.on('end', clearPingInterval);
  }
}

let keyvRedisClient: RedisClientType | RedisClusterType | null = null;
let keyvRedisClientReady:
  | Promise<void>
  | Promise<RedisClientType<Record<string, never>, Record<string, never>, Record<string, never>>>
  | null = null;

if (cacheConfig.USE_REDIS) {
  /**
   * ** WARNING ** Keyv KV client does not support Prefix like @hanzo/kv above.
   * The prefix feature will be handled by the Keyv-KV store in cacheFactory.js
   */
  const redisOptions: Record<string, unknown> = {
    username,
    password,
    socket: {
      tls: ca != null,
      ca,
      connectTimeout: cacheConfig.REDIS_CONNECT_TIMEOUT,
      reconnectStrategy: (retries: number) => {
        if (
          cacheConfig.REDIS_RETRY_MAX_ATTEMPTS > 0 &&
          retries > cacheConfig.REDIS_RETRY_MAX_ATTEMPTS
        ) {
          logger.error(
            `@keyv/redis client giving up after ${cacheConfig.REDIS_RETRY_MAX_ATTEMPTS} reconnection attempts`,
          );
          return new Error('Max reconnection attempts reached');
        }
        const base = Math.min(Math.pow(2, retries) * 100, cacheConfig.REDIS_RETRY_MAX_DELAY);
        const jitter = Math.floor(Math.random() * Math.min(base, 1000));
        const delay = Math.min(base + jitter, cacheConfig.REDIS_RETRY_MAX_DELAY);
        logger.info(`@keyv/redis reconnecting... attempt ${retries}, delay ${delay}ms`);
        return delay;
      },
    },
    disableOfflineQueue: !cacheConfig.REDIS_ENABLE_OFFLINE_QUEUE,
    ...(cacheConfig.REDIS_PING_INTERVAL > 0
      ? { pingInterval: cacheConfig.REDIS_PING_INTERVAL * 1000 }
      : {}),
  };

  keyvRedisClient =
    urls.length === 1 && !cacheConfig.USE_REDIS_CLUSTER
      ? createClient({ url: cacheConfig.REDIS_URI, ...redisOptions })
      : createCluster({
          rootNodes: urls.map((url) => ({ url: url.href })),
          defaults: redisOptions,
        });

  // Add scanIterator method to cluster client for API consistency with standalone client
  if (!('scanIterator' in keyvRedisClient)) {
    const clusterClient = keyvRedisClient as RedisClusterType;
    (keyvRedisClient as unknown as RedisClientType).scanIterator = async function* (
      options?: ScanCommandOptions,
    ) {
      const masters = clusterClient.masters;
      for (const master of masters) {
        const nodeClient = await clusterClient.nodeClient(master);
        for await (const key of nodeClient.scanIterator(options)) {
          yield key;
        }
      }
    };
  }

  keyvRedisClient.setMaxListeners(cacheConfig.REDIS_MAX_LISTENERS);

  keyvRedisClient.on('error', (err) => {
    logger.error('@keyv/redis client error:', err);
  });

  keyvRedisClient.on('connect', () => {
    logger.info('@keyv/redis client connected');
  });

  keyvRedisClient.on('ready', () => {
    logger.info('@keyv/redis client ready');
  });

  keyvRedisClient.on('reconnecting', () => {
    logger.info('@keyv/redis client reconnecting...');
  });

  keyvRedisClient.on('disconnect', () => {
    logger.warn('@keyv/redis client disconnected');
  });

  // Start connection immediately
  keyvRedisClientReady = keyvRedisClient.connect();

  keyvRedisClientReady.catch((err): void => {
    logger.error('@keyv/redis initial connection failed:', err);
    throw err;
  });
}

export { kvClient, keyvRedisClient, keyvRedisClientReady };
