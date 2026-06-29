import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient;

/**
 * Initialize Redis connection
 */
export const initializeRedis = async () => {
  try {
    const reconnectStrategy = (retries) => (retries > 3 ? new Error('Redis connection retries exhausted') : Math.min(retries * 200, 1000));

    // Railway's Redis plugin provides a single REDIS_URL; local/dev uses discrete vars.
    const clientOptions = process.env.REDIS_URL ? {
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 5000, reconnectStrategy },
    } : {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        connectTimeout: 5000,
        reconnectStrategy,
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB, 10) || 1,
    };

    const client = createClient(clientOptions);

    client.on('error', (err) => console.error('Redis Error:', err.message));
    client.on('connect', () => console.log('✓ Redis connected'));

    await client.connect();
    console.log('✓ Redis connection established');
    redisClient = client;
    return client;
  } catch (error) {
    console.warn('⚠ Redis not available (caching disabled):', error.message);
    // Don't throw - Redis is optional
    return null;
  }
};

/**
 * Get Redis client
 */
export const getRedisClient = () => redisClient;

/**
 * Set a key-value pair in Redis
 */
export const redisSet = async (key, value, expiresIn = null) => {
  if (!redisClient) return;
  try {
    if (expiresIn) {
      await redisClient.setEx(key, expiresIn, JSON.stringify(value));
    } else {
      await redisClient.set(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error('Redis SET error:', error);
  }
};

/**
 * Get a value from Redis
 */
export const redisGet = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

/**
 * Delete a key from Redis
 */
export const redisDel = async (key) => {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis DEL error:', error);
  }
};

/**
 * Close Redis connection
 */
export const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✓ Redis connection closed');
    } catch (error) {
      console.error('✗ Failed to close Redis connection:', error.message);
    }
  }
};

export default {
  initializeRedis,
  getRedisClient,
  redisSet,
  redisGet,
  redisDel,
  closeRedis,
};
