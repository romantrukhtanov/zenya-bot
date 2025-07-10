import { REDIS_KEY } from '@/common/redis-key';
import type { RedisService } from '@/redis/redis.service';

type RedisSetArgs = Parameters<RedisService['set']>;
type RedisGetArgs = Parameters<RedisService['get']>;
type RedisDeleteArgs = Parameters<RedisService['delete']>;
type ReturnGet = ReturnType<RedisService['get']>;
type ReturnSet = ReturnType<RedisService['set']>;
type ReturnDelete = ReturnType<RedisService['delete']>;

export interface TelegramRedisOptions {
  /**
   * Префикс, добавляемый ко всем ключам в Redis
   *
   * По умолчанию: 'tg:sess:'
   */
  keyPrefix?: string;
  /**
   * TTL в секундах.
   * Если не передан, ключи будут храниться бессрочно
   */
  ttl?: number;
}

export class TelegramRedis {
  private readonly keyPrefix: string;
  private readonly ttl?: number;

  constructor(
    private readonly redisService: RedisService,
    { keyPrefix = REDIS_KEY.TELEGRAM_SESSION, ttl }: TelegramRedisOptions = {},
  ) {
    this.keyPrefix = keyPrefix;
    this.ttl = ttl;
  }

  async get<TData>(...args: RedisGetArgs): ReturnGet {
    const [key] = args;
    return this.redisService.get<TData>(this.buildKey(key));
  }

  async set<TValue>(...args: RedisSetArgs): ReturnSet {
    const [key, value, options] = args;

    const fullKey = this.buildKey(key);

    const fullOptions = {
      flags: options?.flags ?? [],
      ttl: this.ttl,
    };

    await this.redisService.set<TValue>(fullKey, value as TValue, fullOptions);
  }

  async delete(...args: RedisDeleteArgs): ReturnDelete {
    const [key] = args;
    await this.redisService.delete(this.buildKey(key));
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }
}
