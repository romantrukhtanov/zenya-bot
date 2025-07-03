import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';

import {
	AccountWizard,
	AddCategoryWizard,
	AddFactsWizard,
	AddMetaCardWizard,
	AddPracticeWizard,
	AdminWizard,
	ChatWizard,
	CheckMediaWizard,
	DailyCardWizard,
	OnboardingWizard,
	PracticeWizard,
	SubscriptionSceneUtils,
	SubscriptionWizard,
	SupportWizard,
} from './scenes';
import { TelegramUpdate } from './telegram.update';

import { telegramModuleOptionsFactory } from '@/common/factories';
import { TelegramExceptionFilterProvider } from '@/common/filters';
import { RolesProvider } from '@/common/guards';
import { MiddlewaresModule, RateLimitMiddleware, SentryMiddleware } from '@/common/middlewares';
import { MainMenuService, MediaService } from '@/common/services';
import { CategoryModule } from '@/modules/category';
import { ChapterModule } from '@/modules/chapter';
import { FactModule } from '@/modules/fact';
import { MetaCardModule } from '@/modules/meta-card';
import { PracticeModule } from '@/modules/practice';
import { RedisModule } from '@/redis/redis.module';
import { RedisService } from '@/redis/redis.service';

const ADMIN_SCENES = [
	AddCategoryWizard,
	AddPracticeWizard,
	AddFactsWizard,
	AddMetaCardWizard,
	CheckMediaWizard,
];

const TELEGRAM_SCENES = [
	...ADMIN_SCENES,
	AdminWizard,
	OnboardingWizard,
	PracticeWizard,
	DailyCardWizard,
	SupportWizard,
	SubscriptionWizard,
	AccountWizard,
	ChatWizard,
] as const;

@Module({
	imports: [
		TelegrafModule.forRootAsync({
			imports: [ConfigModule, RedisModule, MiddlewaresModule],
			inject: [ConfigService, RedisService, RateLimitMiddleware, SentryMiddleware],
			useFactory: telegramModuleOptionsFactory,
		}),
		CategoryModule,
		ChapterModule,
		PracticeModule,
		FactModule,
		MetaCardModule,
	],
	providers: [
		SubscriptionSceneUtils,
		RolesProvider,
		TelegramExceptionFilterProvider,
		MediaService,
		MainMenuService,
		TelegramUpdate,
		...TELEGRAM_SCENES,
	],
})
export class TelegramModule {}
