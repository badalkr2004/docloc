import { Redis } from '@upstash/redis';
import { env } from '../config/env';

// This safely initializes the Upstash Redis client.
// It will only be instantiated if the UPSTASH_REDIS_REST_URL is provided, 
// allowing the app to still build/run locally without Redis if needed.
export const redis = (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) 
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;
