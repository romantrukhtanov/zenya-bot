import { Injectable, OnModuleInit } from '@nestjs/common';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Context as TelegrafCtx, MiddlewareFn } from 'telegraf';

import { REDIS_KEY } from '@/common/redis-key';
import { RedisService } from '@/redis/redis.service';
import { translations } from '@/translations';

@Injectable()
export class RateLimitMiddleware implements OnModuleInit {
	private limiter: RateLimiterRedis;

	constructor(private readonly redisService: RedisService) {}

	onModuleInit() {
		this.limiter = new RateLimiterRedis({
			storeClient: this.redisService.redisClient, // клиент Redis для хранения счётчиков
			keyPrefix: REDIS_KEY.TELEGRAM_RATE_LIMIT, // префикс ключей в Redis
			points: 2, // разрешено 2 запроса за окно
			duration: 1, // окно в 1 секунды для восстановления баллов
			inMemoryBlockOnConsumed: 2, // при исчерпании 2 баллов блокировка в памяти
		});
	}

	get telegrafMiddleware(): MiddlewareFn<TelegrafCtx> {
		return async (ctx, next) => {
			const rateLimitKey = ctx.from?.id ?? 'anonymous';

			try {
				await this.limiter.consume(rateLimitKey);
				return next();
			} catch {
				await ctx.reply(translations.shared.rateLimit);
			}
		};
	}
}
