import type { ConfigService } from '@nestjs/config';

export const getTelegramToken = (configService: ConfigService): string => {
	const isProd = configService.get<string>('NODE_ENV') === 'production';

	return (
		configService.get<string>(isProd ? 'TELEGRAM_BOT_TOKEN_PROD' : 'TELEGRAM_BOT_TOKEN_DEV') ?? ''
	);
};
