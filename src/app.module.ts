import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';

import { PrismaModule } from './prisma/prisma.module';

import { serveStaticOptionsFactory } from '@/common/factories';
import { HealthController } from '@/controllets';
import { AgentModule } from '@/modules/agent';
import { BroadcastModule } from '@/modules/broadcast';
import { PaymentModule } from '@/modules/payment';
import { QueueModule } from '@/modules/queue';
import { SentryModule } from '@/modules/sentry';
import { SubscriptionModule } from '@/modules/subscription';
import { UserModule } from '@/modules/user';
import { RedisModule } from '@/redis/redis.module';
import { TelegramModule } from '@/telegram/telegram.module';

@Module({
	controllers: [HealthController],
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		QueueModule.forRoot({ isGlobal: true }),
		ServeStaticModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: serveStaticOptionsFactory,
		}),
		SentryModule,
		PrismaModule,
		PaymentModule,
		RedisModule,
		UserModule,
		TelegramModule,
		SubscriptionModule,
		BroadcastModule,
		AgentModule,
	],
})
export class AppModule {}
