import { Global, Module } from '@nestjs/common';
import { SentryModule as SentryCoreModule } from '@sentry/nestjs/setup';

import { SentryHttpFilterProvider } from './sentry-http.filter';
import { SentryService } from './sentry.service';

@Global()
@Module({
	imports: [SentryCoreModule.forRoot()],
	providers: [SentryService, SentryHttpFilterProvider],
	exports: [SentryService],
})
export class SentryModule {}
