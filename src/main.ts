import './instrument';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
(async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const configService = app.get(ConfigService);

	const appPort = configService.get<string>('APP_PORT');
	const appGlobalPrefix = configService.get<string>('APP_GLOBAL_PREFIX');

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);

	if (typeof appGlobalPrefix === 'string') {
		// Set global app prefix, for example: site.com/api/...
		app.setGlobalPrefix(appGlobalPrefix);
	}

	app.enableShutdownHooks(); // lets Sentry flush on SIGTERM

	await app.listen(appPort || 3000);
})();
