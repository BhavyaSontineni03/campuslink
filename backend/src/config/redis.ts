import Redis from 'ioredis';

const url = process.env.REDIS_URL || 'redis://localhost:6380';

export const redis = new Redis(url, {
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

export async function redisReady(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (err) {
    console.error('Redis unavailable:', err);
    return false;
  }
}

export function isRedisReady(): boolean {
  return redis.status === 'ready';
}

export default redis;
