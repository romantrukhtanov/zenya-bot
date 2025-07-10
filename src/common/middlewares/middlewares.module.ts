import { Module } from '@nestjs/common';

import { RateLimitMiddleware } from './rate-limit';
import { SentryMiddleware } from './sentry';

import { RedisModule } from '@/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [RateLimitMiddleware, SentryMiddleware],
  exports: [RateLimitMiddleware, SentryMiddleware],
})
export class MiddlewaresModule {}
