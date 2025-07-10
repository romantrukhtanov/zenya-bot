import { Global, Module } from '@nestjs/common';

import { QUEUE_SUBSCRIPTIONS } from './constants';
import { SubscriptionService } from './subscription.service';
import { SubscriptionWorker } from './subscription.worker';

import { MediaService } from '@/common/services';
import { QueueModule } from '@/modules/queue';

@Global()
@Module({
  imports: [QueueModule.register({ queues: [QUEUE_SUBSCRIPTIONS] })],
  providers: [SubscriptionService, SubscriptionWorker, MediaService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
