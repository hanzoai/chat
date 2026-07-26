import type { KV, Cluster } from '@hanzo/kv';
import { logger } from '@hanzochat/data-schemas';
import type { IJobStore, IEventTransport } from './interfaces/IJobStore';
import { InMemoryJobStore } from './implementations/InMemoryJobStore';
import { InMemoryEventTransport } from './implementations/InMemoryEventTransport';
import { RedisJobStore } from './implementations/RedisJobStore';
import { RedisEventTransport } from './implementations/RedisEventTransport';
import { cacheConfig } from '~/cache/cacheConfig';
import { kvClient } from '~/cache/redisClients';

/**
 * Configuration for stream services (optional overrides)
 */
export interface StreamServicesConfig {
  /**
   * Override KV detection. If not provided, uses cacheConfig.USE_REDIS.
   */
  useRedis?: boolean;

  /**
   * Override KV client. If not provided, uses kvClient from cache.
   */
  redisClient?: KV | Cluster | null;

  /**
   * Dedicated KV client for pub/sub subscribing.
   * If not provided, will duplicate the main client.
   */
  redisSubscriber?: KV | Cluster | null;

  /**
   * Options for in-memory job store
   */
  inMemoryOptions?: {
    ttlAfterComplete?: number;
    maxJobs?: number;
  };
}

/**
 * Stream services result
 */
export interface StreamServices {
  jobStore: IJobStore;
  eventTransport: IEventTransport;
  isRedis: boolean;
}

/**
 * Create stream services (job store + event transport).
 *
 * Automatically detects KV from cacheConfig.USE_REDIS_STREAMS and uses
 * the existing kvClient. Falls back to in-memory if KV
 * is not configured or not available.
 *
 * USE_REDIS_STREAMS defaults to USE_REDIS if not explicitly set,
 * allowing users to disable KV for streams while keeping it for other caches.
 *
 * @example Auto-detect (uses cacheConfig)
 * ```ts
 * const services = createStreamServices();
 * // Uses KV if USE_REDIS_STREAMS=true (defaults to USE_REDIS), otherwise in-memory
 * ```
 *
 * @example Force in-memory
 * ```ts
 * const services = createStreamServices({ useRedis: false });
 * ```
 */
export function createStreamServices(config: StreamServicesConfig = {}): StreamServices {
  // Use provided config or fall back to cache config (USE_REDIS_STREAMS for stream-specific override)
  const useRedis = config.useRedis ?? cacheConfig.USE_REDIS_STREAMS;
  const redisClient = config.redisClient ?? kvClient;
  const { redisSubscriber, inMemoryOptions } = config;

  // Check if we should and can use KV
  if (useRedis && redisClient) {
    try {
      // For subscribing, we need a dedicated connection
      // If subscriber not provided, duplicate the main client
      let subscriber = redisSubscriber;

      if (!subscriber && 'duplicate' in redisClient) {
        subscriber = (redisClient as KV).duplicate();
        logger.info('[StreamServices] Duplicated KV client for subscriber');
      }

      if (!subscriber) {
        logger.warn('[StreamServices] No subscriber client available, falling back to in-memory');
        return createInMemoryServices(inMemoryOptions);
      }

      const jobStore = new RedisJobStore(redisClient);
      const eventTransport = new RedisEventTransport(redisClient, subscriber);

      logger.info('[StreamServices] Created KV-backed stream services');

      return {
        jobStore,
        eventTransport,
        isRedis: true,
      };
    } catch (err) {
      logger.error(
        '[StreamServices] Failed to create KV services, falling back to in-memory:',
        err,
      );
      return createInMemoryServices(inMemoryOptions);
    }
  }

  return createInMemoryServices(inMemoryOptions);
}

/**
 * Create in-memory stream services
 */
function createInMemoryServices(options?: StreamServicesConfig['inMemoryOptions']): StreamServices {
  const jobStore = new InMemoryJobStore({
    ttlAfterComplete: options?.ttlAfterComplete ?? 300000, // 5 minutes
    maxJobs: options?.maxJobs ?? 1000,
  });

  const eventTransport = new InMemoryEventTransport();

  logger.info('[StreamServices] Created in-memory stream services');

  return {
    jobStore,
    eventTransport,
    isRedis: false,
  };
}
