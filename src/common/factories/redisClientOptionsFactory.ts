import type { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

export const redisClientOptionsFactory = (configService: ConfigService): string | RedisOptions => {
	const redisUri = configService.get<string>('REDIS_URL');

	if (redisUri) {
		return redisUri + '?family=0';
	}

	const host = configService.get<string>('REDIS_HOST', 'localhost');
	const port = configService.get<number>('REDIS_PORT', 6379);
	const password = configService.get<string>('REDIS_PASSWORD', '');
	const db = configService.get<number>('REDIS_DB', 0);

	const options: RedisOptions = { host, port, db, family: 0 };

	if (password) {
		options.password = password;
	}

	return options;
};
