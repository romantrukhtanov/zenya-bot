import type { ConfigService } from '@nestjs/config';
import type { TelegrafModuleOptions } from 'nestjs-telegraf';
import { session } from 'telegraf/session';

import type { RateLimitMiddleware, SentryMiddleware } from '@/common/middlewares';
import { secondsInDays } from '@/common/utils';
import type { RedisService } from '@/redis/redis.service';
import { TelegramRedis } from '@/telegram/telegram.redis';
import { getTelegramToken } from '@/telegram/utils';

const TELEGRAM_SESSION_TTL = secondsInDays(1);

export const telegramModuleOptionsFactory = (
	configService: ConfigService,
	redisService: RedisService,
	rateLimitMiddleware: RateLimitMiddleware,
	sentryMiddleware: SentryMiddleware,
): TelegrafModuleOptions => {
	const ttlSeconds = configService.get<number>(
		'REDIS_SESSION_TTL',
		secondsInDays(TELEGRAM_SESSION_TTL),
	); // 1 День

	const store = new TelegramRedis(redisService, {
		ttl: ttlSeconds,
	});

	return {
		token: getTelegramToken(configService),
		middlewares: [
			rateLimitMiddleware.telegrafMiddleware,
			sentryMiddleware.telegrafMiddleware,
			session({ store }),
		],
	};
};
