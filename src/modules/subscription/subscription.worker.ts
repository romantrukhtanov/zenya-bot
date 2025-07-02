import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_SUBSCRIPTIONS, QueueSubscriptionJob } from './constants';
import { SubscriptionService } from './subscription.service';
import { ExpireJobType, NotifyBeforeExpireJobType } from './types';

@Processor(QUEUE_SUBSCRIPTIONS)
@Injectable()
export class SubscriptionWorker extends WorkerHost {
	private readonly logger = new Logger(SubscriptionWorker.name);

	constructor(private readonly subscriptionService: SubscriptionService) {
		super();
	}

	async process(
		job: Job<ExpireJobType | NotifyBeforeExpireJobType, void, QueueSubscriptionJob>,
	): Promise<void> {
		switch (job.name) {
			case QueueSubscriptionJob.Expire: {
				const { userId } = job.data as ExpireJobType;
				await this.subscriptionService.expireActive(userId);

				this.logger.log(`Switched ${userId} to FREE`);
				return;
			}
			case QueueSubscriptionJob.NotifyBeforeExpire: {
				const { userId, expireAt } = job.data as NotifyBeforeExpireJobType;

				await this.subscriptionService.notifyBeforeExpire(userId, expireAt);

				this.logger.log(`Notified ${userId} about upcoming expiration`);
				return;
			}
		}
	}

	@OnWorkerEvent('completed')
	onCompleted(job: Job<{ userId: string }>) {
		this.logger.log(`Job ${job.name} completed for ${job.data.userId}`);
	}
}
